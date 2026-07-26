# DRHP Copilot — implementation checklist

Work top to bottom. Each phase unlocks the next. Check items off as you go.

## Where to start: backend, frontend, or both?

**Start with foundation, then backend-led vertical slices.**

| Order | Why |
| ----- | --- |
| 1. Supabase + sample data | Everything persists here; you need a project and a corpus to test against. |
| 2. Backend schema + migrations | Auth, chat, retrieval, and citations all depend on the data model. |
| 3. Thin vertical slices | Wire auth, then a stubbed chat stream, then real RAG — each slice touches frontend + backend together. |
| 4. Frontend in parallel (lightly) | Scaffold the SPA early, but don't build citation UI or chat polish until the backend can return real grounded answers. |

The critical path is **data model → ingestion → retrieval → LLM → citations**. The frontend is mostly a streaming chat shell with auth and citation display — it shouldn't get far ahead of working APIs.

---

## Phase 0 — Prerequisites & foundation

- [x] Install toolchain: Python 3.12+, `uv`, Node 20+, `pnpm` (see [README](../README.md))
- [x] Create Supabase project and collect credentials ([supabase-setup](guides/supabase-setup.md))
- [x] Create Gemini API key (needed from Phase 6 onward)
- [ ] Download DRHP corpus — see Phase 4 for scraper details
- [ ] Confirm `data/downloads/manifest.json` lists target companies and filings

---

## Phase 1 — Backend scaffold & database

Goal: a running FastAPI service with a migrated Supabase schema.

- [x] Init backend deps and project layout ([backend-setup](guides/backend-setup.md))
- [x] `app/config.py` — settings module, fail fast on missing env vars
- [x] `app/main.py` — FastAPI app, CORS, health check (`GET /health`)
- [x] SQLAlchemy models in `app/database/models/`:
  - [x] `users`
  - [x] `source_documents`
  - [x] `document_chunks` (embedding + generated `tsvector`)
  - [x] `chat_threads`
  - [x] `chat_messages`
  - [x] `message_citations`
- [x] Alembic init + first migration:
  - [x] `create extension if not exists vector`
  - [x] `vector(768)` embedding column (Gemini text-embedding-004)
  - [x] generated `tsvector` column on chunks
  - [x] HNSW index (vector) + GIN index (full-text)
  - [x] RLS policies (users see only their own chats)
- [x] `uv run alembic upgrade head` against Supabase direct connection
- [x] `app/database/supabase.py` — user-scoped and service-role clients
- [x] Verify: `uv run uvicorn app.main:app --reload` → health check returns 200

---

## Phase 2 — Auth (full stack)

Goal: analysts can sign in with email; backend rejects unauthenticated requests.

**Backend**

- [x] `app/auth/dependencies.py` — verify `Authorization: Bearer <supabase_jwt>`, expose `get_current_user`
- [x] Reject missing/expired tokens with `401` before any chat or retrieval work

**Frontend**

- [x] Scaffold Vite + React + TypeScript + Tailwind + shadcn ([frontend-setup](guides/frontend-setup.md))
- [x] `src/lib/env.ts` — validate `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [x] `src/lib/supabase.ts` — browser Supabase client
- [x] `src/lib/http.ts` + `src/lib/api.ts` — fetch wrapper with automatic bearer token
- [x] Sign-in / sign-up pages (email only, no SSO)
- [x] Protected routes — redirect unauthenticated users to login
- [x] Verify: sign up, sign in, token reaches backend on a test authenticated endpoint

---

## Phase 3 — Chat shell (vertical slice, stubbed)

Goal: end-to-end chat UI streaming from FastAPI, no real retrieval yet.

**Backend**

- [x] Chat thread CRUD: list threads, create thread, load message history
- [x] `POST /api/threads/{id}/stream` — streams a stubbed assistant reply
- [x] Persist user + assistant messages to `chat_messages` after stream completes
- [x] `403` when user accesses another user's thread

**Frontend**

- [x] React Router: login, chat list, chat thread routes
- [x] SSE stream consumer pointed at `POST /api/threads/{id}/stream` with Supabase bearer token
- [x] Thread sidebar (past conversations)
- [x] Basic message list + input + streaming indicator
- [x] Verify: create thread, send message, see streamed stub response, reload and see history

---

## Phase 4 — Ingestion pipeline

Goal: DRHPs and annual reports in the corpus are parsed, chunked, embedded, and stored in Supabase.

**Corpus: Nifty 50 companies — DRHPs (from SEBI) + Annual Reports (from BSE)**

- [ ] `ingest/scraper.py` — download DRHPs from SEBI (sebi.gov.in) and annual reports from BSE filings
- [ ] `ingest/manifest.py` — build `manifest.json` with company, filing type, date, source URL, local path
- [ ] PDF → normalized Markdown/text extraction (preserve page numbers — critical for citations)
- [ ] Chunking strategy (size + overlap; store chunk index, page number, section, company, filing type, year)
- [ ] Write `source_documents` rows with filing metadata from `manifest.json`
- [ ] Write `document_chunks` rows with text + metadata (page number mandatory)
- [ ] Gemini embedding generation (`text-embedding-004`, 768 dims) → store per chunk
- [ ] Generated `tsvector` populated for full-text search
- [ ] Idempotent re-run (skip already-ingested documents by accession/filing ID)
- [ ] Unit tests: chunking logic, page number extraction
- [ ] Run ingestion on initial corpus (target: 30+ DRHPs)
- [ ] Verify: chunks exist in Supabase; spot-check a known passage with correct page number

---

## Phase 5 — Retrieval

Goal: a user question returns ranked, relevant source passages.

- [ ] `retrieval/queries.py` — pgvector semantic search over `document_chunks`
- [ ] `retrieval/queries.py` — Postgres full-text search over `search_vector`
- [ ] `retrieval/fusion.py` — Reciprocal Rank Fusion in Python
- [ ] `retrieval/retriever.py` — query → fused ranked passages + neighbor chunks
- [ ] Unit tests: fusion ranking, query assembly (mock DB)
- [ ] Integration test (optional, `@pytest.mark.integration`): real query against ingested corpus
- [ ] Verify: test queries return relevant chunks with correct page numbers

---

## Phase 6 — LLM agent & grounding

Goal: grounded answers with enforced citations and evidence quality score — the core product contract.

- [ ] `assistant/instructions.md` — product contract (cite page numbers, refuse to invent, no investment advice)
- [ ] PydanticAI agent with typed deps (`DocumentAgentDeps`) and output (`GroundedAnswer`)
  - `GroundedAnswer` includes: `text`, `citations` (page + excerpt), `confidence_score` (0.0–1.0), `evidence_quality` (`strong` | `partial` | `insufficient`)
- [ ] Agent tools: `search_filings`, `read_chunk`, `read_surrounding_chunks`
- [ ] `chat/orchestrator.py` — one turn: retrieve → agent → validate → stream → persist
- [ ] `grounding/validator.py` — every citation maps to a retrieved passage + page number; fail closed on violation
- [ ] `grounding/confidence.py` — score based on: citation count, retrieval scores, coverage of query terms
- [ ] `chat/streaming.py` — stream text deltas + citation metadata + confidence score
- [ ] Persist `message_citations` linked to assistant messages (include page number)
- [ ] Unit tests: citation validation, grounding enforcement, confidence scoring
- [ ] Verify against example questions:
  - [ ] Answers cite specific DRHP page numbers
  - [ ] Under-specified questions get `evidence_quality: insufficient` responses
  - [ ] Questions inferring beyond filings are refused

---

## Phase 7 — Trust UI (citations, source passages & confidence)

Goal: analysts can verify every claim in one click — this is what makes the product usable.

- [ ] Citation chips on assistant messages (company, filing type, date, **page number**)
- [ ] Confidence/evidence quality indicator per answer (badge: Strong / Partial / Insufficient)
- [ ] Source passage panel — show underlying excerpt for selected citation
- [ ] Empty states (no threads, no corpus match)
- [ ] Error states (auth expired, retrieval failure, grounding failure, network/CORS)
- [ ] Loading/streaming status during assistant run
- [ ] Verify: click a citation → see exact passage + page number from the DRHP

---

## Phase 8 — Pilot readiness

Goal: analysts can use it and report meaningful time saved on DRHP intake work.

- [x] README "Running locally" section — copy-paste commands for backend + frontend + env vars
- [ ] Document how to ingest/update the corpus (add new DRHPs)
- [ ] Smoke-test example questions across ingested DRHPs
- [ ] Confirm chat history persists across sessions
- [ ] Basic structured logging on backend (`structlog`) for debugging failed turns
- [ ] Review latency: streaming starts within a few seconds for typical queries

---

## Phase 9 — Deployment (Railway)

- [ ] Railway: backend service (Uvicorn, env vars, `ALLOWED_ORIGINS`)
- [ ] Railway: frontend service (Vite build, `VITE_*` env vars at build time)
- [ ] Supabase: re-enable email confirmation for production if disabled during dev
- [ ] Run `alembic upgrade head` against production Supabase (direct connection)
- [ ] Run ingestion against production database
- [ ] End-to-end test on deployed URLs

---

## Quick reference

| Doc | Purpose |
| --- | ------- |
| [client-brief.md](client-brief.md) | What Mint Street Research needs and example questions |
| [architecture.md](architecture.md) | System design, data model, streaming contract |
| [guides/supabase-setup.md](guides/supabase-setup.md) | Hosted Postgres + Auth |
| [guides/backend-setup.md](guides/backend-setup.md) | FastAPI + Alembic commands |
| [guides/frontend-setup.md](guides/frontend-setup.md) | Vite + React scaffold commands |
