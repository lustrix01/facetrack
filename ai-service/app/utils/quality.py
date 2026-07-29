import base64
import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional
from app.config import settings

def decode_base64_image(base64_str: str) -> Optional[np.ndarray]:
    """
    Decode base64 data URL string into OpenCV BGR uint8 numpy array
    """
    if not base64_str:
        return None
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img_bgr
    except Exception:
        return None

def check_image_quality(img_bgr: np.ndarray, bbox: Optional[list] = None) -> Dict[str, Any]:
    """
    Inspect image for brightness, blurriness, face dimensions, and viewport boundary checks
    """
    if img_bgr is None or img_bgr.size == 0:
        return {
            "passed": False,
            "error_code": "INVALID_IMAGE",
            "message": "Image payload is empty or invalid."
        }

    h, w, _ = img_bgr.shape

    # 1. Brightness check (Grayscale average intensity)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    avg_brightness = float(np.mean(gray))

    if avg_brightness < settings.MIN_BRIGHTNESS:
        return {
            "passed": False,
            "error_code": "IMAGE_TOO_DARK",
            "message": f"Image is too dark (brightness: {avg_brightness:.1f}). Please improve lighting."
        }

    if avg_brightness > settings.MAX_BRIGHTNESS:
        return {
            "passed": False,
            "error_code": "IMAGE_TOO_BRIGHT",
            "message": f"Image is overexposed/too bright (brightness: {avg_brightness:.1f}). Reduce glare."
        }

    # 2. Blur detection via Variance of Laplacian
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if laplacian_var < settings.MIN_LAPLACIAN_VAR:
        return {
            "passed": False,
            "error_code": "IMAGE_TOO_BLURRY",
            "message": f"Image is too blurry (sharpness: {laplacian_var:.1f}). Hold camera steady."
        }

    # 3. Face size and boundary check if bounding box provided [x1, y1, x2, y2]
    if bbox and len(bbox) == 4:
        x1, y1, x2, y2 = bbox
        face_w = x2 - x1
        face_h = y2 - y1

        if face_w < settings.MIN_FACE_SIZE or face_h < settings.MIN_FACE_SIZE:
            return {
                "passed": False,
                "error_code": "FACE_TOO_SMALL",
                "message": f"Face is too small ({face_w}x{face_h}px). Move closer to the camera."
            }

        # Check if face is cut off by image boundary (within 5px of edge)
        margin = 5
        if x1 <= margin or y1 <= margin or x2 >= (w - margin) or y2 >= (h - margin):
            return {
                "passed": False,
                "error_code": "FACE_OUT_OF_BOUNDS",
                "message": "Face is partially outside the frame. Center your face."
            }

    return {
        "passed": True,
        "error_code": None,
        "message": "Image quality check passed.",
        "brightness": round(avg_brightness, 2),
        "sharpness": round(laplacian_var, 2)
    }
