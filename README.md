# Test Automator 🤖

A multi-agent AI-powered test automation platform built with **CrewAI**, **FastAPI**, and **React**.  
Supports **Groq**, **OpenAI**, **Ollama**, **OpenRouter**, and **Claude** as LLM providers with Jira integration and role-based user management.

---

## Features

- **5 AI Agent Tabs** — Product Requirement, Planning, Designing, Automation, Code Review (all with approve/reject workflow)
- **5 LLM Providers** — Groq, OpenAI, Ollama (local), OpenRouter, Claude
- **Role-based access control** — Admin, QA Manager, QA Lead, QA Analyst
- **Rich input modes** — Paste text, upload files (.txt, .md, .pdf, .docx), Jira user stories
- **Editable previews** — All uploaded/generated content shown in editable textareas
- **Approve / Reject workflow** — Output saved to `output/` folder only on approval
- **JWT authentication** — Secure login with token-based sessions
- **Configure page** — System Configuration (LLM provider, model), Jira Configuration (credentials), User Management (add/edit/delete users)
- **Jira integration** — Fetch user stories by issue key, configure Jira URL/credentials via UI

---

## Architecture

```
Test Automator
├── backend/                        FastAPI + CrewAI
│   ├── agents/
│   │   ├── base_agent.py           Base class — dual execution (Groq direct / CrewAI)
│   │   ├── llm_factory.py          LLM provider factory (multi-provider)
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
│   │   ├── auth_routes.py          Auth endpoints + user CRUD
│   │   ├── config_routes.py        Jira config GET/POST (reads/writes .env)
│   │   ├── file_routes.py          File upload / save-output / list-output
│   │   └── jira_routes.py          Jira issue fetch by key
│   ├── auth/                       JWT auth + role permissions + user model
│   ├── config/settings.py          Pydantic settings (reads .env)
│   ├── data/users.json             User store
│   ├── requirements.txt
│   ├── main.py
│   └── .env
├── frontend/                       React + Vite
│   └── src/
│       ├── pages/
│       │   ├── ProductRequirementPage.jsx   Generate / Approve / Reject
│       │   ├── PlanningPage.jsx             Test Plan + Test Strategy
│       │   ├── DesigningPage.jsx            Design Test Cases
│       │   ├── AutomationPage.jsx           Automation scripts
│       │   ├── CodeReviewPage.jsx           Code review
│       │   ├── DashboardPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ConfigurePage.jsx            System / Jira / User Management tabs
│       │   └── SupportPage.jsx
│       ├── components/
│       │   ├── DashboardLayout.jsx
│       │   ├── Sidebar.jsx
│       │   ├── AgentPanel.jsx
│       │   └── Logo.jsx
│       ├── context/AuthContext.jsx   JWT auth context
│       └── api/client.js            Axios client (config, user, jira, agent APIs)
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
# Edit .env — add your API keys
venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API runs at **http://localhost:8000**  
Swagger docs at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
npx vite --port 3000
```

App runs at **http://localhost:3000**

---

## Environment Variables

```env
# ── LLM Providers ──
GROQ_API_KEY=gsk_your-groq-key-here
GROQ_MODEL=llama3-70b-8192

OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=openai/gpt-4o

CLAUDE_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-sonnet-4-20250514

# ── Default provider ──
DEFAULT_LLM_PROVIDER=groq

# ── JWT ──
SECRET_KEY=change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── Jira (optional) ──
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
```

Jira credentials can also be configured from the **Configure → Jira Configuration** page.

---

## LLM Provider Details

| Provider | Setup | Notes |
|----------|-------|-------|
| **Groq** | Set `GROQ_API_KEY` | Fast inference, free tier available |
| **OpenAI** | Set `OPENAI_API_KEY` | GPT-4o via CrewAI + LiteLLM |
| **Ollama** | Run `ollama serve` + `ollama pull llama3` | Local inference, no API key needed |
| **OpenRouter** | Set `OPENROUTER_API_KEY` | Access many models via single API |
| **Claude** | Set `CLAUDE_API_KEY` | Anthropic Claude models |

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@automator.com | admin123 | Admin |

Additional users can be created from **Configure → User Management**.

---

## Role Permissions

| Feature             | Admin | QA Manager | QA Lead | QA Analyst |
|---------------------|-------|------------|---------|------------|
| Dashboard           | ✅    | ✅         | ✅      | ✅         |
| Product Requirement | ✅    | ✅         | ✅      | ✅         |
| Planning            | ✅    | ✅         | ✅      | ✅         |
| Test Strategy       | ✅    | ✅         | ✅      | ❌         |
| Designing           | ✅    | ✅         | ✅      | ❌         |
| Automation          | ✅    | ✅         | ✅      | ✅         |
| Code Review         | ✅    | ✅         | ✅      | ✅         |
| Execution           | ✅    | ✅         | ✅      | ❌         |
| Support             | ✅    | ✅         | ✅      | ✅         |
| Configure / Users   | ✅    | ✅         | ❌      | ❌         |

---

## Configure Page

Three tabs available to Admin users:

1. **System Configuration** — Select LLM provider, enter API key (only the selected provider's field shows), set model name
2. **Jira Configuration** — Set Jira URL, username, and API token (saved to `.env`)
3. **User Management** — View all users, edit role via dropdown, activate/deactivate, or permanently delete users

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
  orchestrator.run_agent() → agent-specific BaseTestAgent subclass
        ↓
  LLM response returned
        ↓
  Editable result pane → Copy / Download PDF / Reject / Approve
        ↓
  Approve → saved to output/{agent}/ folder
  Reject  → discarded
```

---

## File Upload Support

| Format | Parser |
|--------|--------|
| `.txt` | FileReader (UTF-8) |
| `.md`  | FileReader (UTF-8) |
| `.pdf` | `pdfjs-dist` (client-side text extraction) |
| `.docx` / `.doc` | `mammoth` (client-side OOXML extraction) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/register` | Self-registration |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/auth/users` | List all users (Admin) |
| POST | `/api/auth/users` | Create user (Admin) |
| PUT | `/api/auth/users/{id}` | Update user role/status (Admin) |
| DELETE | `/api/auth/users/{id}` | Delete user (Admin) |
| GET | `/api/config/jira` | Read Jira config from `.env` |
| POST | `/api/config/jira` | Write Jira config to `.env` |
| POST | `/api/agents/run` | Run an agent task |
| POST | `/api/files/upload` | Upload a file |
| POST | `/api/files/save-output` | Save approved output |
| GET | `/api/files/list-output` | List saved outputs |
| GET | `/api/files/read-output/{file}` | Read saved output |
| GET | `/api/jira/issue/{key}` | Fetch Jira issue |
