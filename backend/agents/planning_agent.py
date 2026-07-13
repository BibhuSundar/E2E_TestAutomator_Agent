from agents.base_agent import BaseTestAgent
from pathlib import Path

skill = Path(
    "skills/test-plan-generation.SKILL.md"
).read_text(encoding="utf-8")

class PlanningAgent(BaseTestAgent):
    default_llm_provider = "groq"
    role = "Test Planning Strategist"
    goal = (
        "Create comprehensive test plans including scope, test strategy, resource allocation, "
        "timelines, risk assessment, and entry/exit criteria {skill}."
    )
    backstory = (
        "You are an expert QA Lead and Test Manager with deep expertise in test planning "
        "methodologies including Agile, Scrum, and Waterfall. You produce clear, actionable "
        "test plans that align with project goals and delivery timelines."
    )
