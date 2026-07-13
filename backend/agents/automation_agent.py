from pathlib import Path

from agents.base_agent import BaseTestAgent


class AutomationAgent(BaseTestAgent):

    skill = Path(
    "src/qa_agent/skills/automation_script_generation.md"
).read_text()
    default_llm_provider = "groq"

    role = "Test Automation Engineer"
    goal = (
        "Generate browser automation scripts in the language and framework specified "
        "in the task (Language: X, Framework: Y). The task header includes Language, "
        "Framework, Target URL, and POM preferences. Follow the selected language's "
        "syntax and idioms. Use log() for output if the language supports it, "
        "otherwise use the language's standard output (print, console.log, etc.). "
        "Assume browser and page objects are already initialized and available."
    )
    backstory = skill