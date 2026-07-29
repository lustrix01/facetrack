import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.insightface_loader import model_holder
from app.routes import enroll, verify, liveness, quality

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Dedicated Python FastAPI AI microservice for FaceTrack using InsightFace, OpenCV, and ONNX Runtime."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    model_holder.initialize()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "model": settings.INSIGHTFACE_MODEL,
        "insightface_loaded": model_holder.has_insightface
    }

app.include_router(enroll.router, tags=["Face Enrollment"])
app.include_router(verify.router, tags=["Face Verification"])
app.include_router(liveness.router, tags=["Liveness Detection"])
app.include_router(quality.router, tags=["Quality Check"])

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=False)
