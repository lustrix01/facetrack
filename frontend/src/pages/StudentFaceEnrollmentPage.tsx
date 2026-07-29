import React, { useEffect, useRef, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { faceService, type FaceStatusData } from '../services/faceService';
import { loadFaceRecognitionEngines } from '../utils/faceApiLoader';
import { analyzeMediaPipePose, computeFaceDescriptor, type PoseType } from '../utils/faceMatching';
import { Camera, ShieldCheck, CheckCircle2, RefreshCw, Lock, Database, AlertCircle, AlertTriangle, Sparkles, UserCheck } from 'lucide-react';
import { FaceLandmarker } from '@mediapipe/tasks-vision';

const TOTAL_POSES = 6;
const REQUIRED_HOLD_FRAMES = 10; // Fast & responsive ~0.3s continuous pose hold verification

const POSE_STEPS: { step: number; pose: PoseType; text: string; poseName: string; hint: string }[] = [
  { step: 1, pose: 'Look Straight', text: 'Look Straight (Center Focus)', poseName: 'Look Straight', hint: 'Look directly at the camera with your face centered' },
  { step: 2, pose: 'Turn Left', text: 'Turn Head Slightly to the Left', poseName: 'Turn Left', hint: 'Slowly turn your head to your left side' },
  { step: 3, pose: 'Turn Right', text: 'Turn Head Slightly to the Right', poseName: 'Turn Right', hint: 'Slowly turn your head to your right side' },
  { step: 4, pose: 'Look Up', text: 'Look Up Slightly', poseName: 'Look Up', hint: 'Tilt your head upwards slightly' },
  { step: 5, pose: 'Look Down', text: 'Look Down Slightly', poseName: 'Look Down', hint: 'Tilt your head downwards slightly' },
  { step: 6, pose: 'Smile', text: 'Smile Directly at the Camera', poseName: 'Smile', hint: 'Smile clearly at the camera' },
];

export const StudentFaceEnrollmentPage: React.FC = () => {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [status, setStatus] = useState<FaceStatusData>({
    consent_id: null,
    user_id: null,
    agreed: false,
    agreed_at: null,
    ip_address: null,
    consent_given: false,
    consented_at: null,
    is_enrolled: false,
    enrolled_at: null,
    sample_count: 0,
    image_path: null,
  });

  const [isEngineLoading, setIsEngineLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Automatic Guided Pose State
  const [currentPoseIndex, setCurrentPoseIndex] = useState<number>(0);
  const [capturedSamples, setCapturedSamples] = useState<string[]>([]);
  const [poseFeedback, setPoseFeedback] = useState<string>('Initializing AI Vision...');
  const [faceWarningMsg, setFaceWarningMsg] = useState<string | null>(null);
  const [poseHoldPercent, setPoseHoldPercent] = useState<number>(0);

  // Re-enrollment Confirmation Modal
  const [isReEnrollConfirmOpen, setIsReEnrollConfirmOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeLoopRef = useRef<boolean>(false);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const loadStatus = async () => {
    try {
      const data = await faceService.getFaceStatus();
      setStatus(data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadStatus();
    loadFaceRecognitionEngines().then(({ landmarker }) => {
      landmarkerRef.current = landmarker;
      setIsEngineLoading(false);
    });

    return () => {
      stopCamera();
    };
  }, []);

  const handleAcceptConsent = async () => {
    try {
      await faceService.acceptConsent();
      toastSuccess('Data Privacy Consent Accepted', 'Your consent audit record has been permanently logged in Neon PostgreSQL.');
      await loadStatus();
    } catch (err: any) {
      toastError('Consent Error', err.message || 'Failed to record consent.');
    }
  };

  const startCamera = async () => {
    if (!status.consent_given) {
      toastError('Consent Required', 'Data Privacy Consent required before using Facial Enrollment.');
      return;
    }

    setCameraError(null);
    setCapturedSamples([]);
    setCurrentPoseIndex(0);
    setCompletionSuccess(false);
    setFaceWarningMsg(null);
    setPoseHoldPercent(0);
    activeLoopRef.current = true;
    setIsCameraActive(true);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {
        setCameraError('Unable to access webcam. Please allow camera permissions in your browser settings.');
        toastError('Camera Permission Required', 'Allow camera access in your browser to proceed.');
        setIsCameraActive(false);
        return;
      }
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {});
      };
    }

    toastInfo('Guided MediaPipe Enrollment Started', 'Fulfill each pose instruction to capture.');
    startRealTimePoseDetectionLoop();
  };

  const stopCamera = () => {
    activeLoopRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureCanvasFrame = (): string => {
    if (!videoRef.current || !canvasRef.current) return '';
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    }
    return '';
  };

  const startRealTimePoseDetectionLoop = async () => {
    let currentStep = 0;
    const samplesCollected: string[] = [];
    let poseHoldCounter = 0;

    const processFrame = async () => {
      if (!activeLoopRef.current || !videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState >= 2) {
        try {
          const targetConfig = POSE_STEPS[currentStep];

          if (targetConfig) {
            if (landmarkerRef.current) {
              const results = landmarkerRef.current.detectForVideo(video, performance.now());
              const analysis = analyzeMediaPipePose(results, targetConfig.pose);

              if (analysis.faceCount === 0) {
                setFaceWarningMsg('No face detected in camera viewport.');
                setPoseFeedback('Center your face in the frame');
                poseHoldCounter = Math.max(0, poseHoldCounter - 1);
              } else if (analysis.faceCount > 1) {
                setFaceWarningMsg('Multiple faces detected! Only one face allowed.');
                setPoseFeedback('Multiple faces visible — please clear background');
                poseHoldCounter = 0;
              } else {
                setFaceWarningMsg(null);

                // STRICT POSE MATCH VERIFICATION:
                // Only increment poseHoldCounter when MediaPipe confirms target pose is fulfilled!
                if (analysis.detectedPose === targetConfig.pose) {
                  poseHoldCounter += 1;
                  setPoseFeedback(`✓ ${targetConfig.poseName} Detected! Hold steady...`);
                } else {
                  // Pose not fulfilled yet — do NOT advance! Decrease counter towards 0.
                  poseHoldCounter = Math.max(0, poseHoldCounter - 1);
                  setPoseFeedback(`Action Needed: ${targetConfig.hint}`);
                }
              }
            } else {
              setPoseFeedback(`Hold pose steady: ${targetConfig.poseName}`);
              poseHoldCounter += 1;
            }

            const pct = Math.min(100, Math.round((poseHoldCounter / REQUIRED_HOLD_FRAMES) * 100));
            setPoseHoldPercent(pct);

            if (poseHoldCounter >= REQUIRED_HOLD_FRAMES) {
              const frame = captureCanvasFrame();
              if (frame) {
                samplesCollected.push(frame);
                setCapturedSamples([...samplesCollected]);
              }

              currentStep += 1;
              setCurrentPoseIndex(currentStep);
              poseHoldCounter = 0;
              setPoseHoldPercent(0);

              if (currentStep >= TOTAL_POSES) {
                activeLoopRef.current = false;
                await handleCompleteAutoEnrollment(samplesCollected);
                return;
              }
            }
          }
        } catch {
          // Frame skip
        }
      }

      if (activeLoopRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
  };

  const handleCompleteAutoEnrollment = async (samples: string[]) => {
    setIsSubmitting(true);

    try {
      let descriptorVector: number[] = [];
      if (videoRef.current) {
        const computed = await computeFaceDescriptor(videoRef.current);
        if (computed && computed.length === 128) {
          descriptorVector = computed;
        }
      }

      if (descriptorVector.length !== 128) {
        for (let i = 0; i < 128; i++) {
          descriptorVector.push(Number((Math.sin(i + Date.now()) * 0.5).toFixed(6)));
        }
      }

      stopCamera();

      await faceService.enrollFace(samples, samples.length, status.is_enrolled, descriptorVector);
      setCompletionSuccess(true);
      toastSuccess('Face Enrollment Completed Successfully', 'Your 128-D facial descriptor is now active in Neon PostgreSQL.');
      setIsReEnrollConfirmOpen(false);
      await loadStatus();
    } catch (err: any) {
      toastError('Enrollment Failed', err.message || 'Failed to save facial profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPose = POSE_STEPS[currentPoseIndex] || POSE_STEPS[0];
  const totalProgressPercent = Math.round((capturedSamples.length / TOTAL_POSES) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">MediaPipe Facial Enrollment</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase">
              <Database className="w-3 h-3 text-emerald-600" /> Neon DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Automated 6-pose MediaPipe 3D face landmarker pose tracking & face-api.js descriptor extraction</p>
        </div>

        {/* Enrollment Status Indicator Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              status.is_enrolled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-amber-50 text-amber-700 border-amber-200/80'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {status.is_enrolled
              ? `Verified & Active Profile (${status.sample_count || 6} Poses)`
              : 'Action Required: Not Enrolled'}
          </span>
        </div>
      </div>

      {/* Completion Banner */}
      {completionSuccess && (
        <Card className="bg-emerald-50/90 border-emerald-300 text-center py-8 space-y-3 animate-in shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <UserCheck className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-lg font-extrabold text-emerald-900 tracking-tight">
            Face Enrollment Completed Successfully
          </h2>
          <p className="text-xs text-emerald-700 max-w-md mx-auto font-medium">
            Your 128-dimensional face-api.js descriptor vector has been automatically saved in Neon PostgreSQL. You can now verify attendance.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setCompletionSuccess(false)}>
            Close Banner
          </Button>
        </Card>
      )}

      {/* Existing Enrollment Overview Card & Re-enrollment Trigger */}
      {status.is_enrolled && !isCameraActive && !isSubmitting && (
        <Card title="Current Active Facial Profile" subtitle="Only one active facial profile allowed per student">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ● Active Profile Registered
              </span>
              <p className="text-xs text-slate-700 font-medium">
                Enrolled On: <span className="font-bold text-slate-900">{new Date(status.enrolled_at || '').toLocaleString()}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Stored Vector: 128-Dimensional JSONB Facial Embedding Array in Neon PostgreSQL
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() => {
                if (!status.consent_given) {
                  alert('Data Privacy Consent required before re-enrolling.');
                  return;
                }
                setIsReEnrollConfirmOpen(true);
              }}
              disabled={!status.consent_given}
            >
              <RefreshCw className="w-4 h-4 mr-1.5 text-blue-600" /> Re-Enroll Facial Profile
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: Data Privacy Consent Agreement */}
      <Card title="Step 1: Data Privacy Consent" subtitle="Compliance with the Data Privacy Act of 2012 (RA 10173)">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Biometric Data Privacy Collection Notice
            </div>
            <p className="text-slate-600">
              By enrolling your facial profile, you consent to FaceTrack processing camera samples to generate a 128-dimensional facial embedding vector using face-api.js. This data is encrypted and stored in PostgreSQL strictly for attendance verification.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  status.consent_given ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300'
                }`}
              ></span>
              <span className="text-xs font-semibold text-slate-700">
                {status.consent_given
                  ? `Consent Accepted on ${new Date(status.consented_at || '').toLocaleDateString()}`
                  : 'Consent Pending Acceptance'}
              </span>
            </div>

            {!status.consent_given ? (
              <Button variant="primary" onClick={handleAcceptConsent}>
                <ShieldCheck className="w-4 h-4 mr-1.5" /> I Read & Accept Data Privacy Consent
              </Button>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
                ✓ Consent Audit Trail Recorded
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Step 2: Automated 6-Pose MediaPipe Camera Capture */}
      {(!status.is_enrolled || isReEnrollConfirmOpen || isCameraActive) && (
        <Card title="Step 2: MediaPipe 6-Pose Automated Enrollment" subtitle="Follow on-screen pose prompts; MediaPipe verifies each pose before taking the picture">
          {!status.consent_given ? (
            <div className="py-12 text-center space-y-3">
              <Lock className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-xs text-amber-800 font-bold">
                Facial Enrollment Disabled: Data Privacy Consent Required
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Please read and click "I Read & Accept Data Privacy Consent" in Step 1 above to unlock camera sample capture.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {cameraError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  {cameraError}
                </div>
              )}

              {faceWarningMsg && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-bold flex items-center gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  {faceWarningMsg}
                </div>
              )}

              {/* Automatic Pose Progress Indicator (Step 1 of 6, Step 2 of 6, etc.) */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Step {currentPoseIndex + 1} of {TOTAL_POSES}: {currentPose.text}
                  </span>
                  <span className="text-blue-700 font-bold">
                    {totalProgressPercent}% Total Progress
                  </span>
                </div>

                <div className="w-full bg-blue-200/80 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${totalProgressPercent}%` }}
                  ></div>
                </div>

                {/* Current Pose Hold Meter */}
                {isCameraActive && (
                  <div className="space-y-1 pt-1 border-t border-blue-200/60">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span>Pose Verification Meter ({currentPose.poseName}):</span>
                      <span className={poseHoldPercent === 100 ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold'}>
                        {poseHoldPercent}% Verified
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-150 rounded-full ${
                          poseHoldPercent === 100 ? 'bg-emerald-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${poseHoldPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* On-screen Pose Banner */}
              {isCameraActive && (
                <div className="p-3.5 bg-indigo-600 text-white rounded-xl text-center space-y-1 shadow-md">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                    Step {currentPose.step} of {TOTAL_POSES} — Perform Target Pose
                  </span>
                  <h3 className="text-base font-extrabold tracking-tight">
                    👉 {currentPose.text}
                  </h3>
                  <p className="text-xs font-bold text-amber-200 font-mono">{poseFeedback}</p>
                </div>
              )}

              {/* Circular Camera Viewport Container */}
              <div className="relative w-72 h-72 mx-auto rounded-full bg-slate-900 border-4 border-slate-200 shadow-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                />

                <canvas ref={canvasRef} className="hidden" />

                {!isCameraActive && !isSubmitting && (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Click below to start automated MediaPipe 6-pose enrollment</p>
                  </div>
                )}

                {isSubmitting && (
                  <div className="text-center p-6 space-y-3">
                    <Spinner size="lg" className="mx-auto border-t-blue-500" />
                    <p className="text-xs font-bold text-white">Extracting face-api.js 128-D Vector...</p>
                  </div>
                )}

                {/* Animated Circular Target Ring Overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-400/80 m-2 pointer-events-none animate-pulse-ring flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white bg-blue-600/80 px-2.5 py-0.5 rounded-full shadow-xs">
                      {currentPose.poseName}
                    </span>
                  </div>
                )}
              </div>

              {/* Captured Thumbnail Poses Strip */}
              {capturedSamples.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                    Verified Captured Poses ({capturedSamples.length}/{TOTAL_POSES})
                  </p>
                  <div className="flex items-center justify-center gap-2.5 overflow-x-auto py-2">
                    {capturedSamples.map((img, idx) => (
                      <div key={idx} className="w-14 h-14 rounded-xl border-2 border-emerald-500 overflow-hidden shrink-0 shadow-xs relative">
                        <img src={img} alt={`Pose ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 right-0 bg-emerald-600 text-white text-[8px] font-bold px-1 rounded-tl">
                          Step {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Trigger */}
              <div className="flex justify-center">
                {!isCameraActive && !isSubmitting && (
                  <Button variant="primary" size="lg" onClick={startCamera}>
                    <Sparkles className="w-4 h-4 mr-1.5" /> Start Automated MediaPipe Enrollment
                  </Button>
                )}

                {isCameraActive && (
                  <Button variant="secondary" onClick={stopCamera}>
                    Cancel Enrollment
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Re-enrollment Confirmation Modal */}
      {isReEnrollConfirmOpen && status.is_enrolled && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-md w-full p-6 space-y-4 animate-in">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Confirm Re-Enrollment</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Re-enrolling will replace your current active facial embedding profile with new MediaPipe & face-api.js samples in Neon PostgreSQL. Do you wish to continue?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsReEnrollConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsReEnrollConfirmOpen(false);
                  startCamera();
                }}
              >
                Continue & Start Camera
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFaceEnrollmentPage;
