from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.models.insightface_loader import model_holder
from app.utils.quality import decode_base64_image
from app.utils.liveness import verify_liveness_and_pose

router = APIRouter()

class LivenessRequest(BaseModel):
    image: str
    target_pose: Optional[str] = "Smile"

@router.post("/liveness")
async def check_liveness(
    payload: LivenessRequest,
    x_ai_api_key: Optional[str] = Header(None)
):
    if x_ai_api_key != settings.AI_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")

    img_bgr = decode_base64_image(payload.image)
    if img_bgr is None:
        return {"liveness_passed": False, "message": "Invalid image payload"}

    status_code, face_list = model_holder.detect_and_embed(img_bgr)
    if status_code != "OK" or not face_list:
        return {"liveness_passed": False, "status_code": status_code, "message": "Face not detected"}

    face = face_list[0]
    return verify_liveness_and_pose(
        img_bgr,
        landmarks=face.get("landmarks"),
        pose_angles=face.get("pose"),
        target_pose=payload.target_pose or "Smile"
    )
