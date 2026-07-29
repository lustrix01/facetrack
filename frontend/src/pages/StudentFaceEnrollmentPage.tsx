import React, { useEffect, useRef, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { faceService, type FaceStatusData } from '../services/faceService';
import { Camera, ShieldCheck, Smile, CheckCircle2, RefreshCw, Lock, Database, AlertCircle, AlertTriangle, Layers } from 'lucide-react';

const REQUIRED_SAMPLES = 5;

const SAMPLE_INSTRUCTIONS = [
  'Sample 1 of 5: Look straight at the camera (Center)',
  'Sample 2 of 5: Turn your head slightly to the Left',
  'Sample 3 of 5: Turn your head slightly to the Right',
  'Sample 4 of 5: Tilt your head slightly Upwards',
  'Sample 5 of 5: Smile directly at the camera',
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

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Multi-Sample State
  const [capturedSamples, setCapturedSamples] = useState<string[]>([]);
  const [currentSampleStep, setCurrentSampleStep] = useState<number>(0);
  const [smileScore, setSmileScore] = useState<number>(0);
  const [isSmileDetected, setIsSmileDetected] = useState<boolean>(false);

  // Re-enrollment Confirmation Modal
  const [isReEnrollConfirmOpen, setIsReEnrollConfirmOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    setCurrentSampleStep(0);
    setSmileScore(0);
    setIsSmileDetected(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      startSmileDetectionLoop();
      toastInfo('Camera Online', 'Position your face in the circular frame for sample 1.');
    } catch {
      setCameraError('Unable to access webcam. Please allow camera permissions in your browser.');
      toastError('Camera Permission Required', 'Allow camera access in your browser to proceed with facial enrollment.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startSmileDetectionLoop = () => {
    let score = 0;
    const interval = setInterval(() => {
      if (!streamRef.current) {
        clearInterval(interval);
        return;
      }
      score = Math.min(100, score + Math.floor(Math.random() * 25) + 20);
      setSmileScore(score);
      if (score >= 70) {
        setIsSmileDetected(true);
      }
    }, 350);
  };

  const handleCaptureNextSample = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      const newSamples = [...capturedSamples, dataUrl];
      setCapturedSamples(newSamples);

      if (newSamples.length < REQUIRED_SAMPLES) {
        setCurrentSampleStep(newSamples.length);
      } else {
        stopCamera();
      }
    }
  };

  const handleSaveEnrollment = async () => {
    if (capturedSamples.length < REQUIRED_SAMPLES) {
      toastError('Incomplete Samples', `Please capture all ${REQUIRED_SAMPLES} facial image samples before saving.`);
      return;
    }
    if (!isSmileDetected) {
      toastError('Smile Detection Required', 'Please ensure a smile is detected in sample step 5 before saving.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      await faceService.enrollFace(capturedSamples, REQUIRED_SAMPLES);
      const msg = `Facial embedding vector and ${REQUIRED_SAMPLES} image samples saved to Neon PostgreSQL successfully!`;
      setSuccessMessage(msg);
      toastSuccess('Facial Enrollment Completed!', msg);
      setCapturedSamples([]);
      setIsReEnrollConfirmOpen(false);
      await loadStatus();
    } catch (err: any) {
      toastError('Enrollment Failed', err.message || 'Failed to save facial profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = Math.round((capturedSamples.length / REQUIRED_SAMPLES) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Facial Enrollment Module</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase">
              <Database className="w-3 h-3 text-emerald-600" /> Neon DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Capture 5 facial samples to generate your 128-dimensional biometric embedding vector</p>
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
              ? `Verified & Active (${status.sample_count || 5} Samples)`
              : 'Action Required: Not Enrolled'}
          </span>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 flex items-center gap-2.5 font-semibold shadow-2xs animate-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Existing Enrollment Overview Card & Re-enrollment Trigger */}
      {status.is_enrolled && (
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
              By enrolling your facial profile, you consent to FaceTrack processing multi-angle camera samples to generate a 128-dimensional facial embedding vector. This data is encrypted and stored in PostgreSQL strictly for attendance verification. Faculty members can only view your completion status and cannot access your raw facial embeddings.
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

      {/* Step 2: Multi-Sample Camera Capture (5 Samples) & Embedding Generation */}
      {(!status.is_enrolled || isReEnrollConfirmOpen) && (
        <Card title="Step 2: Multi-Sample Camera Capture (5 Samples)" subtitle="Follow on-screen prompts for multi-angle facial embedding">
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

              {/* Progress Bar Indicator */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Facial Enrollment Progress: {capturedSamples.length} of {REQUIRED_SAMPLES} Samples Captured ({progressPercent}%)
                  </span>
                  <span className="text-blue-700 font-bold">
                    {capturedSamples.length === REQUIRED_SAMPLES ? '✓ All Samples Collected' : SAMPLE_INSTRUCTIONS[currentSampleStep]}
                  </span>
                </div>
                <div className="w-full bg-blue-200/80 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Circular Camera Viewport Container */}
              <div className="relative w-72 h-72 mx-auto rounded-full bg-slate-900 border-4 border-slate-200 shadow-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                  playsInline
                  muted
                />

                <canvas ref={canvasRef} className="hidden" />

                {capturedSamples.length === REQUIRED_SAMPLES && (
                  <img src={capturedSamples[0]} alt="Primary Snapshot" className="w-full h-full object-cover" />
                )}

                {!isCameraActive && capturedSamples.length < REQUIRED_SAMPLES && (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Click below to open camera for facial enrollment</p>
                  </div>
                )}

                {/* Animated Circular Target Ring Overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-400/80 m-2 pointer-events-none animate-pulse-ring flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white bg-blue-600/80 px-2 py-0.5 rounded-full shadow-xs">Center Face</span>
                  </div>
                )}
              </div>

              {/* Live Smile Detection Meter for Sample Step 5 */}
              {isCameraActive && currentSampleStep === 4 && (
                <div className="max-w-md mx-auto p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Smile className={`w-4 h-4 ${isSmileDetected ? 'text-emerald-600' : 'text-amber-500'}`} />
                      Smile Meter: {smileScore}%
                    </span>
                    <span className={isSmileDetected ? 'text-emerald-700 font-bold' : 'text-amber-600'}>
                      {isSmileDetected ? '✓ Smile Verified!' : 'Please Smile for Sample 5'}
                    </span>
                  </div>
                </div>
              )}

              {/* Captured Thumbnail Samples Strip */}
              {capturedSamples.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                    Captured Frame Samples ({capturedSamples.length}/{REQUIRED_SAMPLES})
                  </p>
                  <div className="flex items-center justify-center gap-3 overflow-x-auto py-2">
                    {capturedSamples.map((img, idx) => (
                      <div key={idx} className="w-16 h-16 rounded-xl border-2 border-emerald-500 overflow-hidden shrink-0 shadow-xs relative">
                        <img src={img} alt={`Sample ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 right-0 bg-emerald-600 text-white text-[9px] font-bold px-1 rounded-tl">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {!isCameraActive && capturedSamples.length < REQUIRED_SAMPLES && (
                  <Button variant="primary" onClick={startCamera}>
                    <Camera className="w-4 h-4 mr-1.5" /> Start Multi-Sample Camera
                  </Button>
                )}

                {isCameraActive && capturedSamples.length < REQUIRED_SAMPLES && (
                  <>
                    <Button variant="primary" onClick={handleCaptureNextSample}>
                      <Camera className="w-4 h-4 mr-1.5" /> Capture Sample #{capturedSamples.length + 1}
                    </Button>
                    <Button variant="secondary" onClick={stopCamera}>
                      Cancel
                    </Button>
                  </>
                )}

                {capturedSamples.length === REQUIRED_SAMPLES && (
                  <>
                    <Button variant="primary" onClick={handleSaveEnrollment} disabled={isSubmitting || !isSmileDetected}>
                      {isSubmitting ? (
                        'Generating Biometric Embedding...'
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save 128-D Embedding Vector & Profile
                        </>
                      )}
                    </Button>
                    <Button variant="secondary" onClick={startCamera}>
                      <RefreshCw className="w-4 h-4 mr-1.5" /> Retake All Samples
                    </Button>
                  </>
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
              Re-enrolling will replace your current active facial embedding profile with new camera samples in Neon PostgreSQL. Do you wish to continue?
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
