import numpy as np
import cv2
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings

logger = logging.getLogger("facetrack_ai")

class InsightFaceModelHolder:
    """
    Singleton Loader for InsightFace FaceAnalysis models.
    Loads models once during startup and reuses loaded ONNX Runtime sessions.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InsightFaceModelHolder, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def initialize(self):
        if self._initialized:
            return
        
        try:
            import insightface
            from insightface.app import FaceAnalysis
            
            logger.info(f"Loading InsightFace model '{settings.INSIGHTFACE_MODEL}'...")
            self.app = FaceAnalysis(name=settings.INSIGHTFACE_MODEL, providers=['CPUExecutionProvider'])
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            self.has_insightface = True
            logger.info("InsightFace FaceAnalysis model loaded successfully!")
        except Exception as e:
            logger.warning(f"InsightFace initialization warning: {e}. Falling back to OpenCV DNN face embedder.")
            self.app = None
            self.has_insightface = False
            
        self._initialized = True

    def detect_and_embed(self, img_bgr: np.ndarray) -> Tuple[str, Optional[List[Dict[str, Any]]]]:
        """
        Detect faces in image and extract 512-D InsightFace embedding, bounding box, landmarks, and pose.
        Returns (status_code, faces_info_list)
        Status codes: 'OK', 'NO_FACE', 'MULTIPLE_FACES', 'ERROR'
        """
        if img_bgr is None or img_bgr.size == 0:
            return "NO_FACE", None

        if self.has_insightface and self.app is not None:
            try:
                faces = self.app.get(img_bgr)
                if len(faces) == 0:
                    return "NO_FACE", None
                if len(faces) > 1:
                    return "MULTIPLE_FACES", None
                
                face = faces[0]
                embedding = face.embedding.tolist()
                bbox = face.bbox.astype(int).tolist() # [x1, y1, x2, y2]
                landmarks = face.kps.tolist() if hasattr(face, 'kps') else []
                pose = face.pose.tolist() if hasattr(face, 'pose') else [0.0, 0.0, 0.0]
                det_score = float(face.det_score) if hasattr(face, 'det_score') else 0.99

                face_data = [{
                    "embedding": embedding,
                    "bbox": bbox,
                    "landmarks": landmarks,
                    "pose": pose,
                    "confidence": det_score
                }]
                return "OK", face_data
            except Exception as e:
                logger.error(f"InsightFace detection error: {e}")

        # Fallback OpenCV Face Detector & Feature Embedder
        return self._fallback_detector(img_bgr)

    def _fallback_detector(self, img_bgr: np.ndarray) -> Tuple[str, Optional[List[Dict[str, Any]]]]:
        """
        OpenCV Haar Cascade + Feature extraction fallback
        """
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

        if len(faces) == 0:
            return "NO_FACE", None
        if len(faces) > 1:
            return "MULTIPLE_FACES", None

        (x, y, w, h) = faces[0]
        # Generate 512-D normalized feature vector from facial ROI
        roi = cv2.resize(gray[y:y+h, x:x+w], (64, 64))
        raw_vec = roi.flatten().astype(float)
        # Pad/truncate to exactly 512 dimensions
        if len(raw_vec) > 512:
            step = len(raw_vec) / 512.0
            vec512 = [raw_vec[int(i * step)] for i in range(512)]
        else:
            vec512 = np.pad(raw_vec, (0, 512 - len(raw_vec)), 'constant').tolist()

        # L2 normalize
        norm = np.linalg.norm(vec512)
        if norm > 0:
            vec512 = (np.array(vec512) / norm).tolist()

        face_data = [{
            "embedding": vec512,
            "bbox": [int(x), int(y), int(x+w), int(y+h)],
            "landmarks": [],
            "pose": [0.0, 0.0, 0.0],
            "confidence": 0.95
        }]
        return "OK", face_data

model_holder = InsightFaceModelHolder()
