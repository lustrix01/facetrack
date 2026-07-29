import * as faceapi from '@vladmandic/face-api';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export type PoseType = 'Look Straight' | 'Turn Left' | 'Turn Right' | 'Look Up' | 'Look Down' | 'Smile';

export type PoseDetectionResult = {
  faceCount: number;
  detectedPose: PoseType | null;
  smileScore: number;
  isSmileDetected: boolean;
  yawDegrees: number;
  pitchDegrees: number;
  message: string;
};

/**
 * Analyze MediaPipe 3D facial landmarks for pose angles & smile ratio
 */
export function analyzeMediaPipePose(
  results: FaceLandmarkerResult | null,
  targetPose: PoseType
): PoseDetectionResult {
  if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
    return {
      faceCount: 0,
      detectedPose: null,
      smileScore: 0,
      isSmileDetected: false,
      yawDegrees: 0,
      pitchDegrees: 0,
      message: 'No face detected in camera viewport.',
    };
  }

  const faceCount = results.faceLandmarks.length;
  if (faceCount > 1) {
    return {
      faceCount,
      detectedPose: null,
      smileScore: 0,
      isSmileDetected: false,
      yawDegrees: 0,
      pitchDegrees: 0,
      message: 'Multiple faces detected. Please ensure only ONE student is in front of the camera.',
    };
  }

  const landmarks = results.faceLandmarks[0];

  // Key landmark indices (MediaPipe 468 mesh model)
  const noseTip = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  // Estimate yaw (horizontal turn angle)
  const leftDist = Math.abs(noseTip.x - leftCheek.x);
  const rightDist = Math.abs(rightCheek.x - noseTip.x);
  const yawRatio = (rightDist - leftDist) / (rightDist + leftDist || 1);
  const yawDegrees = roundToTwoDecimals(yawRatio * 90);

  // Estimate pitch (vertical tilt angle)
  const topDist = Math.abs(noseTip.y - forehead.y);
  const bottomDist = Math.abs(chin.y - noseTip.y);
  const pitchRatio = (bottomDist - topDist) / (bottomDist + topDist || 1);
  const pitchDegrees = roundToTwoDecimals(pitchRatio * 90);

  // Smile detection via blendshapes or lip corner width
  let smileScore = 0;
  if (results.faceBlendshapes && results.faceBlendshapes[0]) {
    const categories = results.faceBlendshapes[0].categories;
    const mouthSmileLeft = categories.find((c) => c.categoryName === 'mouthSmileLeft')?.score || 0;
    const mouthSmileRight = categories.find((c) => c.categoryName === 'mouthSmileRight')?.score || 0;
    smileScore = roundToTwoDecimals(Math.max(mouthSmileLeft, mouthSmileRight) * 100);
  } else {
    // Landmark mouth width check fallback
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];
    const topLip = landmarks[0];
    const bottomLip = landmarks[17];
    const mouthWidth = Math.hypot(rightCorner.x - leftCorner.x, rightCorner.y - leftCorner.y);
    const mouthHeight = Math.hypot(bottomLip.x - topLip.x, bottomLip.y - topLip.y);
    smileScore = mouthWidth > 0 ? roundToTwoDecimals(Math.min(100, (mouthWidth / (mouthHeight || 1)) * 30)) : 50;
  }

  const isSmileDetected = smileScore >= 45;

  // Determine current active pose
  let detectedPose: PoseType | null = null;
  if (Math.abs(yawDegrees) < 14 && Math.abs(pitchDegrees) < 10) {
    detectedPose = 'Look Straight';
  } else if (yawDegrees > 14) {
    detectedPose = 'Turn Right';
  } else if (yawDegrees < -14) {
    detectedPose = 'Turn Left';
  } else if (pitchDegrees > 7) {
    detectedPose = 'Look Up';
  } else if (pitchDegrees < -7) {
    detectedPose = 'Look Down';
  }

  if (isSmileDetected) {
    detectedPose = 'Smile';
  }

  // Validate target pose match
  let isTargetAchieved = false;
  switch (targetPose) {
    case 'Look Straight':
      isTargetAchieved = Math.abs(yawDegrees) < 15 && Math.abs(pitchDegrees) < 12;
      break;
    case 'Turn Left':
      isTargetAchieved = yawDegrees < -12;
      break;
    case 'Turn Right':
      isTargetAchieved = yawDegrees > 12;
      break;
    case 'Look Up':
      isTargetAchieved = pitchDegrees > 6;
      break;
    case 'Look Down':
      isTargetAchieved = pitchDegrees < -6;
      break;
    case 'Smile':
      isTargetAchieved = isSmileDetected;
      break;
  }

  return {
    faceCount: 1,
    detectedPose: isTargetAchieved ? targetPose : detectedPose,
    smileScore,
    isSmileDetected,
    yawDegrees,
    pitchDegrees,
    message: isTargetAchieved ? `✓ ${targetPose} Verified!` : `Hold pose: ${targetPose}`,
  };
}

/**
 * Generate 128-d Face Descriptor using face-api.js with retry loop
 */
export async function computeFaceDescriptor(
  videoElement: HTMLVideoElement,
  maxRetries: number = 5
): Promise<number[] | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && detection.descriptor) {
        return Array.from(detection.descriptor);
      }
    } catch {
      // Retry
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

/**
 * Perform 1:1 Face Matching using face-api.js FaceMatcher
 */
export function verifyFaceMatch(
  liveDescriptor: number[],
  storedDescriptor: number[],
  distanceThreshold = 0.60
): { isMatched: boolean; distance: number; similarityPercent: number } {
  if (!liveDescriptor.length || !storedDescriptor.length) {
    return { isMatched: false, distance: 1.0, similarityPercent: 0 };
  }

  const liveVec = new Float32Array(liveDescriptor);
  const storedVec = new Float32Array(storedDescriptor);

  const matcher = new faceapi.FaceMatcher(
    new faceapi.LabeledFaceDescriptors('student', [storedVec]),
    distanceThreshold
  );

  const match = matcher.findBestMatch(liveVec);
  const distance = match.distance;
  const isMatched = match.label === 'student' && distance <= distanceThreshold;
  const similarityPercent = roundToTwoDecimals(Math.max(0, (1 - distance) * 100));

  return {
    isMatched,
    distance,
    similarityPercent,
  };
}

function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}
