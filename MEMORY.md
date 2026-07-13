# Project Memory

Tracks all changes made to the project.

---

## 2026-07-13

### Logo update
- Updated all references from `/abbcreation-logo.jpg` to `/NatWest_Logo.png` in:
  - `frontend/src/components/Logo.jsx`
  - `frontend/src/pages/LandingPage.jsx`
  - `frontend/src/pages/LoginPage.jsx`
  - `frontend/src/pages/RegisterPage.jsx`
  - `frontend/src/pages/ForgotPasswordPage.jsx`
- Renamed `frontend/public/natwest_logo.png` → `frontend/public/NatWest_Logo.png`

### Switched default LLM to Groq
- **`.env`**: `DEFAULT_LLM_PROVIDER=ollama` → `DEFAULT_LLM_PROVIDER=groq`
- **`config/settings.py`**: default `"openai"` → `"groq"`
- **All 5 agents**: `default_llm_provider = "ollama"` → `"groq"`:
  - `product_requirement_agent.py`, `planning_agent.py`, `automation_agent.py`, `execution_agent.py`, `test_strategy_agent.py`
- **`api/support_routes.py`**: Groq now tried before Ollama (Ollama won't be available in production)

### Railway deployment prep
- **Reverted** Oracle Cloud changes to `docker-compose.yml` and `backend/config/settings.py`.
- `backend/main.py` CORS — kept Vercel regex (still needed for Railway).
- **`backend/Dockerfile`**: Created production-ready Dockerfile (no `--reload`).
- **`frontend/vercel.json`**: Updated proxy target placeholder to Railway URL.
