"""
Base agent — dual execution strategy:

  - groq:   Direct LangChain ChatGroq call (bypasses CrewAI's prompt-caching
            which injects cache_breakpoint fields that Groq rejects)
  - openai: CrewAI + LiteLLM (native support, no caching issues)
  - ollama: CrewAI + LiteLLM (native support)
"""
import os
os.environ.setdefault("LITELLM_LOG", "ERROR")
os.environ["LITELLM_DROP_PARAMS"] = "true"

from config.settings import settings


class BaseTestAgent:
    role: str      = "Test Agent"
    goal: str      = "Assist in software testing"
    backstory: str = "An experienced QA professional."

    # ── Direct Groq call via LangChain (no CrewAI) ──────────────────────────
    async def _execute_groq(self, full_task: str) -> str:
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0.3,
        )

        system_prompt = (
            f"You are a {self.role}.\n"
            f"Goal: {self.goal}\n"
            f"Background: {self.backstory}\n\n"
            f"Provide a detailed, structured, professional response."
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=full_task),
        ]

        response = await llm.ainvoke(messages)
        return response.content

    # ── CrewAI call for OpenAI / Ollama ─────────────────────────────────────
    async def _execute_crewai(self, full_task: str, model_name: str) -> str:
        from crewai import Agent, Task, Crew, Process

        agent = Agent(
            role=self.role,
            goal=self.goal,
            backstory=self.backstory,
            llm=model_name,
            verbose=False,
            allow_delegation=False,
        )

        task = Task(
            description=full_task,
            agent=agent,
            expected_output="A detailed, structured response addressing the task.",
        )

        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=False,
        )

        result = await crew.kickoff_async()
        return str(result)

    # ── Main entry point ────────────────────────────────────────────────────
    async def execute(
        self,
        task_description: str,
        context: str = None,
        llm_provider: str = "groq",
    ) -> str:
        try:
            full_task = task_description
            if context:
                full_task = f"Context:\n{context}\n\nTask:\n{task_description}"

            provider = (llm_provider or settings.default_llm_provider).lower().strip()

            if provider == "groq":
                return await self._execute_groq(full_task)
            else:
                from agents.llm_factory import get_llm
                model_name = get_llm(provider)
                return await self._execute_crewai(full_task, model_name)

        except Exception as e:
            return self._stub_response(task_description, str(e))

    def _stub_response(self, task: str, error: str) -> str:
        return (
            f"[PLACEHOLDER — {self.role}]\n\n"
            f"Task received: {task}\n\n"
            f"Could not reach the LLM. Check your API key and model name in .env\n\n"
            f"Debug info: {error}"
        )
