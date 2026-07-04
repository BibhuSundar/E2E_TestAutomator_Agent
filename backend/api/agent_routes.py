from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from auth.dependencies import get_current_user, require_permission
from auth.models import UserOut
from agents.orchestrator import TestAutomatorOrchestrator

router = APIRouter(prefix="/api/agents", tags=["agents"])

orchestrator = TestAutomatorOrchestrator()


class AgentRequest(BaseModel):
    agent: str                                        # e.g. "product_requirement"
    task: str                                         # user's task/prompt
    context: Optional[str] = None
    llm_provider: Optional[str] = "groq"             # "openai" | "groq" | "ollama"


class AgentResponse(BaseModel):
    agent: str
    result: str
    status: str


@router.post("/run", response_model=AgentResponse)
async def run_agent(
    request: AgentRequest,
    current_user: UserOut = Depends(get_current_user),
):
    # Check permission for the requested agent
    if request.agent not in current_user.permissions:
        raise HTTPException(status_code=403, detail=f"No access to '{request.agent}' agent")

    result = await orchestrator.run_agent(
        agent_name=request.agent,
        task=request.task,
        context=request.context,
        llm_provider=request.llm_provider,
    )
    return AgentResponse(agent=request.agent, result=result, status="completed")


@router.get("/list")
async def list_agents(current_user: UserOut = Depends(get_current_user)):
    """Returns available agents based on user's permissions."""
    all_agents = [
        {"id": "product_requirement", "name": "Product Requirement", "description": "Analyze and extract product requirements"},
        {"id": "planning", "name": "Planning", "description": "Create test plans and strategies"},
        {"id": "designing", "name": "Designing", "description": "Design test cases and test architecture"},
        {"id": "automation", "name": "Automation", "description": "Generate automation test scripts"},
        {"id": "code_review", "name": "Code Review", "description": "Review test code quality"},
        {"id": "execution", "name": "Execution", "description": "Execute test suites and report results"},
        {"id": "deployer", "name": "Deployer", "description": "Deploy tests to target environments"},
    ]
    accessible = [a for a in all_agents if a["id"] in current_user.permissions]
    return {"agents": accessible}
