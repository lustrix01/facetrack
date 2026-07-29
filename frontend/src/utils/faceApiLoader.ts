import * as faceapi from '@vladmandic/face-api';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let isFaceApiModelsLoaded = false;
let faceLandmarkerInstance: FaceLandmarker | null = null;
let loadingPromise: Promise<void> | null = null;

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

/**
 * Singleton Loader for face-api.js models and MediaPipe FaceLandmarker
 */
export async function loadFaceRecognitionEngines(): Promise<{
  faceapi: typeof faceapi;
  landmarker: FaceLandmarker | null;
}> {
  if (isFaceApiModelsLoaded && faceLandmarkerInstance) {
    return { faceapi, landmarker: faceLandmarkerInstance };
  }

  if (loadingPromise) {
    await loadingPromise;
    return { faceapi, landmarker: faceLandmarkerInstance };
  }

  loadingPromise = (async () => {
    try {
      // 1. Load face-api.js neural net models
      if (!isFaceApiModelsLoaded) {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        isFaceApiModelsLoaded = true;
      }

      // 2. Initialize MediaPipe FaceLandmarker
      if (!faceLandmarkerInstance) {
        const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
        faceLandmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 2,
        });
      }
    } catch {
      // Graceful fallback
    }
  })();

  await loadingPromise;
  loadingPromise = null;
  return { faceapi, landmarker: faceLandmarkerInstance };
}
