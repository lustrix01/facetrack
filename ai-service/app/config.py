import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "FaceTrack Python AI Microservice"
    VERSION: str = "1.0.0"
    
    # Shared secret API Key for secure PHP-to-Python communication
    AI_SECRET_KEY: str = os.getenv("AI_SECRET_KEY", "facetrack_ai_secret_key_2026_x89f")
    
    # InsightFace Model Configuration
    INSIGHTFACE_MODEL: str = os.getenv("INSIGHTFACE_MODEL", "buffalo_l")
    
    # Cosine Similarity Threshold for 512-D ArcFace InsightFace embeddings
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.42"))
    
    # Quality inspection thresholds
    MIN_BRIGHTNESS: float = float(os.getenv("MIN_BRIGHTNESS", "30.0"))
    MAX_BRIGHTNESS: float = float(os.getenv("MAX_BRIGHTNESS", "245.0"))
    MIN_LAPLACIAN_VAR: float = float(os.getenv("MIN_LAPLACIAN_VAR", "60.0"))
    MIN_FACE_SIZE: int = int(os.getenv("MIN_FACE_SIZE", "80"))
    
    # Server host & port
    HOST: str = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "5000"))

settings = Settings()
