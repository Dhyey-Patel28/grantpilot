# GrantPilot

GrantPilot is an AI-assisted civic grant readiness platform that helps local teams turn rough project ideas into ranked grant matches, plain-English requirements, and a staff-ready readiness packet.

The public portfolio deployment is designed to work without live API credentials by using saved sample workflow data. Local development can use the backend, grant cache pipeline, and live agent workflow when environment variables are configured.

## What GrantPilot Does

Small public teams often know what they need to build, but grant funding is scattered across portals, dense requirements, deadlines, match rules, and document checklists.

GrantPilot helps with that workflow:

1. Start with a plain-English project description.
2. Profile the project into structured grant-matching fields.
3. Rank relevant grant opportunities.
4. Explain why each grant may fit.
5. Translate grant requirements into plain English.
6. Identify readiness gaps and missing documents.
7. Generate a readiness packet for human review.

GrantPilot does not replace official grant review. It helps teams organize the work, verify sources, and move faster from project idea to funding action.

## Key Features

- Project intake for rough local-government project descriptions
- Saved projects and saved workflow state
- Ranked grant matches with source and fit signals
- Grant detail review with deadline, funding, match, and trust cues
- Plain-English requirements translation
- Readiness gap analysis
- Staff-ready readiness packet generation
- Exportable packet content
- Source-health and refresh metadata
- Portfolio-safe static fallback mode
- Optional live backend and IBM/watsonx agent workflow for local development

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Static fallback data for portfolio deployment

### Backend

- Node.js
- Express
- Local workflow trace storage
- Grant database/cache services
- Agent workflow orchestration
- Readiness packet generation endpoints

### Data / Pipeline

- Public grant cache pipeline
- Grants.gov-style normalized records
- Deduplication
- Source-health metadata
- Refresh status reporting

## Project Structure

```txt
grantPilot/
├── frontend/              # Next.js app
├── backend/               # Express backend and live workflow API
├── src/                   # Grant refresh/cache pipeline
├── data/                  # Pipeline config and generated metadata
├── cache/                 # Local generated grant cache, ignored by git
├── scripts/               # Local helper scripts
├── recording_tools/       # Optional manual recording helper files
└── README.md
```

## Portfolio Demo Mode

The deployed portfolio version can run without backend APIs or IBM credentials.

Recommended production frontend environment:

```env
NEXT_PUBLIC_GRANTPILOT_DEMO_MODE=true
NEXT_PUBLIC_GRANTPILOT_API_BASE=static
```

In this mode, the frontend uses saved sample data from:

```txt
frontend/public/demo/
```

This keeps the public demo usable even after trial APIs or local credentials are unavailable.

## Local Development

GrantPilot has two main parts:

- `backend/` — Express API and live agent workflow
- `frontend/` — Next.js app

The public portfolio deployment can run from saved demo data, but local development can run the live backend if your environment variables are configured.

### 1. Clone the Repository

```powershell
git clone https://github.com/YOUR_USERNAME/grantpilot.git
cd grantpilot
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Create a Python Virtual Environment

Some local refresh/cache workflows may use Python tooling.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

### 3. Install Root Dependencies

From the project root:

```powershell
npm install
```

### 4. Install Backend Dependencies

```powershell
cd backend
npm install
cd ..
```

### 5. Install Frontend Dependencies

```powershell
cd frontend
npm install
cd ..
```

### 6. Configure Backend Environment

Create a local backend environment file:

```powershell
copy backend\.env.example backend\.env
```

Then edit:

```txt
backend/.env
```

Add your local API keys, IBM/watsonx settings, and other backend configuration there.

Do not commit `backend/.env`.

### 7. Run the Backend

Open a terminal:

```powershell
cd backend
npm run dev
```

The backend usually runs at:

```txt
http://localhost:5050
```

### 8. Run the Frontend

Open a second terminal:

```powershell
cd frontend
npm run dev
```

The frontend usually runs at:

```txt
http://localhost:3000
```

### 9. Open the App

Visit:

```txt
http://localhost:3000
```

## Running the Portfolio-Safe Frontend Locally

To test the frontend-only fallback mode locally, set the frontend environment to:

```env
NEXT_PUBLIC_GRANTPILOT_DEMO_MODE=true
NEXT_PUBLIC_GRANTPILOT_API_BASE=static
```

Then run:

```powershell
cd frontend
npm run dev
```

This mode should work without the backend.

## Build Check

Before pushing or deploying:

```powershell
cd frontend
npm install
npm run build
```

If using the backend locally:

```powershell
cd backend
npm install
npm run dev
```

## Deploying to Vercel

Deploy only the frontend folder.

Recommended Vercel settings:

```txt
Root Directory: frontend
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

Recommended Vercel environment variables:

```env
NEXT_PUBLIC_GRANTPILOT_DEMO_MODE=true
NEXT_PUBLIC_GRANTPILOT_API_BASE=static
```

Do not add backend API keys or IBM credentials to the public portfolio deployment unless you intentionally deploy a secured backend.

## GitHub Safety

Do not commit local secrets, generated cache files, recordings, or build artifacts.

These should stay ignored:

```txt
backend/.env
.env
frontend/.env.local
node_modules/
frontend/.next/
backend/data/
cache/
outputs/
.venv/
```

Safe public files include:

```txt
frontend/.env.example
frontend/.env.production
frontend/public/demo/*.json
```

## Suggested Demo Flow

For a portfolio walkthrough:

```txt
Dashboard
→ Saved Projects
→ Grant Explorer
→ Grant Detail
→ Translator
→ Agents
→ Readiness Packet
→ Analytics
```

The most important payoff screen is the Readiness Packet. It shows the project case, grant fit, required documents, action plan, and human review checklist.

## Notes

GrantPilot is intended as a portfolio-ready civic-tech prototype. It demonstrates product engineering, data normalization, backend workflow design, AI-assisted review, and frontend UX polish.

The deployed demo uses saved sample workflow data so the app remains reviewable without requiring live agent credentials.
