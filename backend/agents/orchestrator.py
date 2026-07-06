"""
Test Automator Orchestrator
Controls all sub-agents and routes tasks to the appropriate agent.
"""
from typing import Optional

from agents.product_requirement_agent import ProductRequirementAgent
from agents.planning_agent import PlanningAgent
from agents.test_strategy_agent import TestStrategyAgent
from agents.designing_agent import DesigningAgent
from agents.automation_agent import AutomationAgent
from agents.code_review_agent import CodeReviewAgent
from agents.execution_agent import ExecutionAgent
from agents.deployer_agent import DeployerAgent


class TestAutomatorOrchestrator:
    """
    Orchestrator that routes tasks to the appropriate sub-agent.
    In future iterations, this will use CrewAI's multi-agent collaboration
    to chain agents together for end-to-end workflows.
    """

    def __init__(self):
        self._registry = {
            "product_requirement": ProductRequirementAgent(),
            "planning": PlanningAgent(),
            "test_strategy": TestStrategyAgent(),
            "designing": DesigningAgent(),
            "automation": AutomationAgent(),
            "code_review": CodeReviewAgent(),
            "execution": ExecutionAgent(),
            "deployer": DeployerAgent(),
        }

    async def run_agent(
        self,
        agent_name: str,
        task: str,
        context: Optional[str] = None,
        llm_provider: str = None,
    ) -> str:
        agent = self._registry.get(agent_name)
        if not agent:
            raise ValueError(f"Unknown agent: {agent_name}")
        return await agent.execute(task, context, llm_provider)

    async def run_full_pipeline(
        self,
        requirement: str,
        llm_provider: str = "openai",
    ) -> dict:
        """
        Chains all agents in sequence: Requirement → Planning → Design →
        Automation → Code Review → Execution → Deploy.
        Each agent's output feeds as context into the next.
        """
        results = {}
        context = requirement

        pipeline = [
            ("product_requirement", f"Analyze this requirement: {requirement}"),
            ("planning", "Create a test plan based on the requirements above."),
            ("designing", "Design test cases based on the test plan above."),
            ("automation", "Generate automation scripts for the test cases above."),
            ("code_review", "Review the automation scripts above."),
            ("execution", "Prepare execution strategy for the tests above."),
            ("deployer", "Prepare deployment plan for the test pipeline above."),
        ]

        for agent_name, task in pipeline:
            result = await self.run_agent(agent_name, task, context, llm_provider)
            results[agent_name] = result
            context = result  # pass output to next agent

        return results
