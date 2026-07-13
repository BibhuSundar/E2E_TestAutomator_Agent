from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.auth_routes import router as auth_router
from api.agent_routes import router as agent_router
from api.jira_routes import router as jira_router
from api.file_routes import router as file_router
from api.config_routes import router as config_router
from api.support_routes import router as support_router

app = FastAPI(
    title="Test Automator API",
    description="Multi-agent test automation system powered by CrewAI",
    version="1.0.0",
)

# CORS — allow React frontend (local dev + Vercel production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(agent_router)
app.include_router(jira_router)
app.include_router(file_router)
app.include_router(config_router)
app.include_router(support_router)


@app.get("/")
async def root():
    return {"message": "Test Automator API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
