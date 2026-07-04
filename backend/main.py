from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.auth_routes import router as auth_router
from api.agent_routes import router as agent_router

app = FastAPI(
    title="Test Automator API",
    description="Multi-agent test automation system powered by CrewAI",
    version="1.0.0",
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(agent_router)


@app.get("/")
async def root():
    return {"message": "Test Automator API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
