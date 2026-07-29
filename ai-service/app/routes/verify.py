import numpy as np
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.config import settings
from app.models.insightface_loader import model_holder
from app.utils.quality import decode_base64_image, check_image_quality
from app.utils.liveness import verify_liveness_and_pose

router = APIRouter()

class VerifyRequest(BaseModel):
    image: str
    stored_embedding: List[float]
    require_smile: Optional[bool] = True

class VerifyResponse(BaseModel):
    match: bool
    status: str
    result_code: str
    message: str
    similarity: float
    confidence: float
    liveness_passed: bool
    quality_passed: bool

@router.post("/verify", response_model=VerifyResponse)
async def verify_face(
    payload: VerifyRequest,
    x_ai_api_key: Optional[str] = Header(None)
):
    # Security header validation
    if x_ai_api_key != settings.AI_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")

    if not payload.image:
        return VerifyResponse(
            match=False,
            status="error",
            result_code="INVALID_IMAGE",
            message="No image provided for verification.",
            similarity=0.0,
            confidence=0.0,
            liveness_passed=False,
            quality_passed=False
        )

    if not payload.stored_embedding or len(payload.stored_embedding) == 0:
        return VerifyResponse(
            match=False,
            status="error",
            result_code="NOT_ENROLLED",
            message="Student has no enrolled facial embedding profile.",
            similarity=0.0,
            confidence=0.0,
            liveness_passed=False,
            quality_passed=False
        )

    img_bgr = decode_base64_image(payload.image)
    if img_bgr is None:
        return VerifyResponse(
            match=False,
            status="error",
            result_code="INVALID_IMAGE",
            message="Failed to decode image payload.",
            similarity=0.0,
            confidence=0.0,
            liveness_passed=False,
            quality_passed=False
        )

    # Detect face & generate live InsightFace embedding
    status_code, face_list = model_holder.detect_and_embed(img_bgr)

    if status_code == "NO_FACE":
        return VerifyResponse(
            match=False,
            status="error",
            result_code="NO_FACE",
            message="No face detected in camera viewport.",
            similarity=0.0,
            confidence=0.0,
            liveness_passed=False,
            quality_passed=False
        )

    if status_code == "MULTIPLE_FACES":
        return VerifyResponse(
            match=False,
            status="error",
            result_code="MULTIPLE_FACES",
            message="Multiple faces detected! Only one student face allowed.",
            similarity=0.0,
            confidence=0.0,
            liveness_passed=False,
            quality_passed=False
        )

    face = face_list[0]
    bbox = face.get("bbox")
    landmarks = face.get("landmarks")
    pose = face.get("pose")
    live_embedding = np.array(face["embedding"], dtype=float)
    stored_embedding = np.array(payload.stored_embedding, dtype=float)

    # 1. Quality Inspection
    quality_res = check_image_quality(img_bgr, bbox=bbox)
    if not quality_res["passed"]:
        return VerifyResponse(
            match=False,
            status="error",
            result_code=quality_res["error_code"],
            message=quality_res["message"],
            similarity=0.0,
            confidence=0.0,
            liveness_passed=False,
            quality_passed=False
        )

    # 2. Liveness Inspection (Smile check)
    target_pose = "Smile" if payload.require_smile else "Look Straight"
    liveness_res = verify_liveness_and_pose(img_bgr, landmarks=landmarks, pose_angles=pose, target_pose=target_pose)
    
    if payload.require_smile and not liveness_res["liveness_passed"]:
        return VerifyResponse(
            match=False,
            status="error",
            result_code="SMILE_REQUIRED",
            message="Smile verification failed. Please smile directly at the camera.",
            similarity=0.0,
            confidence=0.0,
            liveness_passed=False,
            quality_passed=True
        )

    # 3. 1:1 Cosine Similarity Verification against student's enrolled embedding
    dot_product = float(np.dot(live_embedding, stored_embedding))
    norm_live = float(np.linalg.norm(live_embedding))
    norm_stored = float(np.linalg.norm(stored_embedding))
    similarity = dot_product / (norm_live * norm_stored) if (norm_live > 0 and norm_stored > 0) else 0.0
    similarity = round(max(0.0, min(1.0, similarity)), 4)

    is_matched = similarity >= settings.SIMILARITY_THRESHOLD
    confidence_percent = round(similarity * 100.0, 2)

    if not is_matched:
        return VerifyResponse(
            match=False,
            status="error",
            result_code="FACE_NOT_MATCHED",
            message=f"Face does not match the enrolled student (Similarity: {confidence_percent}%).",
            similarity=similarity,
            confidence=confidence_percent,
            liveness_passed=True,
            quality_passed=True
        )

    return VerifyResponse(
        match=True,
        status="success",
        result_code="MATCH_SUCCESS",
        message=f"Facial verification successful! Match similarity: {confidence_percent}%.",
        similarity=similarity,
        confidence=confidence_percent,
        liveness_passed=True,
        quality_passed=True
    )
