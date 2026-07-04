# Test Automator 🤖

A multi-agent AI-powered test automation platform built with **CrewAI**, **FastAPI**, and **React**.  
Supports **Groq**, **OpenAI**, and **Ollama** as LLM providers.

---

## Features

- **7 AI Agents** — Product Requirement, Planning, Designing, Automation, Code Review, Execution, Deployer
- **3 LLM Providers** — Groq (fast, free tier), OpenAI GPT-4o, Ollama (local)
- **Role-based access control** — Admin, QA Manager, QA Lead, QA Analyst
- **Rich input modes** — Paste text, upload files (.txt, .md, .pdf, .docx), Jira user stories
- **PDF export** — Download AI-generated documents as PDF
- **Approve workflow** — Lock and approve generated documents
- **JWT authentication** — Secure login with token-based sessions

---

## Architecture

```
Test Automator
├── backend/                        FastAPI + CrewAI
│   ├── agents/
│   │   ├── base_agent.py           Base class — dual execution (Groq direct / CrewAI)
│   │   ├── llm_factory.py          LLM provider factory (Groq / OpenAI / Ollama)
│   │   ├── orchestrator.py         Routes tasks to the right agent
│   │   ├── product_requirement_agent.py
│   │   ├── planning_agent.py
│   │   ├── designing_agent.py
│   │   ├── automation_agent.py
│   │   ├── code_review_agent.py
│   │   ├── execution_agent.py
│   │   └── deployer_agent.py
│   ├── api/
│   │   ├── agent_routes.py         POST /api/agents/run
│   │   └── auth_routes.py          POST /api/auth/login, /register, /me
│   ├── auth/                       JWT auth + role permissions
│   ├── config/settings.py          Pydantic settings (reads .env)
│   ├── data/users.json             User store
│   ├── requirements.txt
│   └── main.py
├── frontend/                       React + Vite
│   └── src/
│       ├── pages/
│       │   ├── ProductRequirementPage.jsx   Paste / Upload / Jira → Generate → Approve
│       │   ├── PlanningPage.jsx             Paste / Upload / Jira → Generate Test Plan
│       │   ├── DesigningPage.jsx            Paste / Upload / Jira → Design Test Cases
│       │   ├── AgentPage.jsx                Generic page (Automation, Code Review, etc.)
│       │   ├── DashboardPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ConfigurePage.jsx
│       │   └── SupportPage.jsx
│       ├── components/
│       │   ├── DashboardLayout.jsx
│       │   ├── Sidebar.jsx
│       │   ├── AgentPanel.jsx
│       │   └── Logo.jsx
│       ├── context/AuthContext.jsx  JWT auth context
│       └── api/client.js           Axios client (auto-attaches JWT)
└── docker/                         Dockerfile + nginx config
```

---

## Quick Start (Local)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your GROQ_API_KEY (or OPENAI_API_KEY)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API runs at **http://localhost:8000**  
Swagger docs at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:3000**

### 3. Docker (full stack)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
docker-compose up --build
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
# ── Groq (recommended — fast & has free tier) ──
GROQ_API_KEY=gsk_your-groq-key-here
GROQ_MODEL=llama3-70b-8192

# ── OpenAI (optional) ──
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o

# ── Ollama local (optional) ──
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# ── Default provider ──
DEFAULT_LLM_PROVIDER=groq          # openai | groq | ollama

# ── JWT ──
SECRET_KEY=change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

Get a free Groq API key at → https://console.groq.com/keys

---

## LLM Provider Details

| Provider | Setup | Notes |
|----------|-------|-------|
| **Groq** | Set `GROQ_API_KEY` | Fast inference, free tier available. Uses `langchain_groq` directly (bypasses CrewAI caching layer which is incompatible with Groq) |
| **OpenAI** | Set `OPENAI_API_KEY` | GPT-4o via CrewAI + LiteLLM |
| **Ollama** | Run `ollama serve` + `ollama pull llama3` | Local inference, no API key needed |

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | secret | Admin |
| manager@test.com | secret | QA Manager |
| lead@test.com | secret | QA Lead |
| analyst@test.com | secret | QA Analyst |

---

## Role Permissions

| Feature             | Admin | QA Manager | QA Lead | QA Analyst |
|---------------------|-------|------------|---------|------------|
| Dashboard           | ✅    | ✅         | ✅      | ✅         |
| Product Requirement | ✅    | ✅         | ✅      | ✅         |
| Planning            | ✅    | ✅         | ✅      | ✅         |
| Designing           | ✅    | ✅         | ✅      | ❌         |
| Automation          | ✅    | ✅         | ✅      | ✅         |
| Code Review         | ✅    | ✅         | ✅      | ✅         |
| Execution           | ✅    | ✅         | ✅      | ❌         |
| Deployer            | ✅    | ✅         | ❌      | ❌         |
| Configure           | ✅    | ✅         | ❌      | ❌         |
| Support             | ✅    | ✅         | ✅      | ✅         |

---

## Agent Flow

```
User Input (Paste / Upload / Jira)
        ↓
  Generate button
        ↓
  POST /api/agents/run
  { agent: "product_requirement", task: "...", llm_provider: "groq" }
        ↓
  agent_routes.py → permission check
        ↓
  orchestrator.run_agent()
        ↓
  ProductRequirementAgent.execute()  ← inherits BaseTestAgent
        ↓
  Groq → ChatGroq.ainvoke()          (direct LangChain, no CrewAI caching)
  OpenAI/Ollama → CrewAI + LiteLLM
        ↓
  Refined document returned
        ↓
  Display in result pane → Copy / Download PDF / Approve
```

---

## File Upload Support

The Product Requirement, Planning, and Designing pages support:

| Format | Parser |
|--------|--------|
| `.txt` | FileReader (UTF-8) |
| `.md`  | FileReader (UTF-8) |
| `.pdf` | `pdfjs-dist` (client-side text extraction) |
| `.docx` / `.doc` | `mammoth` (client-side OOXML extraction) |

---

## Known Issues & Fixes Applied

| Issue | Fix |
|-------|-----|
| `cache_breakpoint` Groq error | Groq calls bypass CrewAI, use `ChatGroq.ainvoke()` directly |
| `crew.kickoff()` async error | Use `crew.kickoff_async()` for FastAPI async context |
| CrewAI `Agent(llm=ChatGroq(...))` validation error | Pass model name string `"groq/llama3-70b-8192"` not LangChain object |

---

## Project Structure Notes

- `base_agent.py` — Groq uses direct LangChain path; OpenAI/Ollama use CrewAI + LiteLLM
- `llm_factory.py` — Returns model name strings for CrewAI (not LangChain objects)
- `ProductRequirementPage.jsx` — Has full approve workflow with PDF export
- `PlanningPage.jsx` / `DesigningPage.jsx` — Same layout as Product Requirement page
- Remaining agents (Automation, Code Review, Execution, Deployer) use the generic `AgentPage`

---

## Next Steps

- [ ] Add approve workflow to Planning and Designing pages
- [ ] Add persistent session/history per agent
- [ ] Enable full pipeline mode (chain all 7 agents sequentially)
- [ ] Add real Jira API integration (fetch story by issue key)
- [ ] Extend file upload to Planning and Designing pages
- [ ] Add user management UI for Admin role
