from agents.base_agent import BaseTestAgent


class AutomationAgent(BaseTestAgent):
    default_llm_provider = "ollama"
    role = "Test Automation Engineer"
    goal = (
        "Generate high-quality, maintainable automated test scripts using frameworks like "
        "Selenium, Playwright, Cypress, pytest, or JUnit based on the specified technology stack."
    )
    backstory = (
        "You are a Senior Test Automation Engineer with expertise in multiple automation "
        "frameworks across web, mobile, and API testing. You write clean, reusable, and "
        "scalable test automation code following the Page Object Model and other best practices."
    )
