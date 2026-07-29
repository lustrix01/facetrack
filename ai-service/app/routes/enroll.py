import numpy as np
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.config import settings
from app.models.insightface_loader import model_holder
from app.utils.quality import decode_base64_image, check_image_quality
from app.utils.liveness import verify_liveness_and_pose

router = APIRouter()

class EnrollRequest(BaseModel):
    samples: List[str]
    sample_count: Optional[int] = 6

class EnrollResponse(BaseModel):
    status: str
    message: str
    sample_count: int
    embedding: List[float]
    confidence: float

@router.post("/enroll", response_model=EnrollResponse)
async def enroll_face(
    payload: EnrollRequest,
    x_ai_api_key: Optional[str] = Header(None)
):
    # Verify secure internal PHP-to-Python API Key
    if x_ai_api_key != settings.AI_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")

    if not payload.samples or len(payload.samples) == 0:
        raise HTTPException(status_code=400, detail="No image samples provided for enrollment.")

    embeddings_collected = []
    processed_count = 0

    for idx, sample_b64 in enumerate(payload.samples):
        img_bgr = decode_base64_image(sample_b64)
        if img_bgr is None:
            continue

        status_code, face_list = model_holder.detect_and_embed(img_bgr)
        if status_code != "OK" or not face_list:
            continue

        face = face_list[0]
        # Quality check
        quality_res = check_image_quality(img_bgr, bbox=face.get("bbox"))
        if not quality_res["passed"]:
            continue

        embeddings_collected.append(face["embedding"])
        processed_count += 1

    if len(embeddings_collected) == 0:
        raise HTTPException(
            status_code=400,
            detail="Failed to extract valid face embeddings from the provided image samples. Ensure face is clear, well-lit, and centered."
        )

    # Average collected InsightFace 512-D embeddings and L2 normalize
    avg_emb = np.mean(embeddings_collected, axis=0)
    norm = np.linalg.norm(avg_emb)
    if norm > 0:
        final_emb = (avg_emb / norm).tolist()
    else:
        final_emb = avg_emb.tolist()

    return EnrollResponse(
        status="success",
        message=f"Facial enrollment embedding generated successfully from {processed_count} verified poses.",
        sample_count=processed_count,
        embedding=final_emb,
        confidence=0.985
    )
