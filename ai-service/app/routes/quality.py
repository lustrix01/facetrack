from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.models.insightface_loader import model_holder
from app.utils.quality import decode_base64_image, check_image_quality

router = APIRouter()

class QualityRequest(BaseModel):
    image: str

@router.post("/quality-check")
async def check_quality(
    payload: QualityRequest,
    x_ai_api_key: Optional[str] = Header(None)
):
    if x_ai_api_key != settings.AI_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")

    img_bgr = decode_base64_image(payload.image)
    if img_bgr is None:
        return {"passed": False, "error_code": "INVALID_IMAGE", "message": "Invalid image format"}

    status_code, face_list = model_holder.detect_and_embed(img_bgr)
    if status_code != "OK" or not face_list:
        return {"passed": False, "error_code": status_code, "message": f"Face detection failed: {status_code}"}

    bbox = face_list[0].get("bbox")
    return check_image_quality(img_bgr, bbox=bbox)
