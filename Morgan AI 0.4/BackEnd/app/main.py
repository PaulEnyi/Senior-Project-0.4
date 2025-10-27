from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
from dotenv import load_dotenv

# Import routers
from app.api.routes import chat, voice, admin, internship
from app.services.pinecone_service import PineconeService
from app.services.openai_service import OpenAIService
from app.core.config import settings
from app.api.middleware.cors import get_cors_config

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize services
# websocket_manager = WebSocketManager()  # Commented out if not used

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown"""
    logger.info("Starting Morgan AI Chatbot Backend...")
    
    # Initialize Pinecone
    try:
        pinecone_service = PineconeService()
        app.state.pinecone = pinecone_service
        logger.info("Pinecone service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Pinecone: {e}")
    
    # Initialize OpenAI
    try:
        openai_service = OpenAIService()
        app.state.openai = openai_service
        logger.info("OpenAI service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI: {e}")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Morgan AI Chatbot Backend...")
    # await websocket_manager.disconnect_all()  # Commented out if not used

# Create FastAPI app
app = FastAPI(
    title="Morgan AI Chatbot API",
    description="AI-powered assistant for Morgan State University Computer Science Department",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    **get_cors_config()
)

# Include routers
# app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(internship.router, prefix="/api/internships", tags=["Internships"])
# app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge Base"])

# Serve static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "Morgan AI Chatbot API",
        "status": "operational",
        "version": "1.0.0",
        "university": "Morgan State University",
        "department": "Computer Science"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health_status = {
        "status": "healthy",
        "services": {
            "api": "operational",
            "openai": "unknown",
            "pinecone": "unknown"
        }
    }
    
    # Check OpenAI
    try:
        if hasattr(app.state, 'openai'):
            health_status["services"]["openai"] = "operational"
    except:
        health_status["services"]["openai"] = "error"
    
    # Check Pinecone
    try:
        if hasattr(app.state, 'pinecone'):
            health_status["services"]["pinecone"] = "operational"
    except:
        health_status["services"]["pinecone"] = "error"
    
    return health_status

@app.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time chat"""
    await websocket_manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Process message
            response = await app.state.openai.process_realtime_message(
                message=data.get("message"),
                session_id=session_id,
                voice_enabled=data.get("voice_enabled", False)
            )
            
            # Send response
            await websocket_manager.send_personal_message(
                response,
                websocket,
                session_id
            )
            
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket, session_id)
        logger.info(f"Client {session_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket_manager.disconnect(websocket, session_id)

@app.websocket("/ws/voice/{session_id}")
async def websocket_voice(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time voice communication"""
    await websocket_manager.connect(websocket, session_id)
    try:
        while True:
            # Receive audio data
            audio_data = await websocket.receive_bytes()
            
            # Process with OpenAI Realtime API
            response = await app.state.openai.process_realtime_audio(
                audio_data=audio_data,
                session_id=session_id
            )
            
            # Send response audio
            if response.get("audio"):
                await websocket.send_bytes(response["audio"])
            
            # Send transcript if available
            if response.get("transcript"):
                await websocket.send_json({
                    "type": "transcript",
                    "text": response["transcript"]
                })
            
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket, session_id)
        logger.info(f"Voice client {session_id} disconnected")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
        await websocket_manager.disconnect(websocket, session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )