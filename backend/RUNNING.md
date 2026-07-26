# Running the backend

All commands run from `backend/`. Never activate the venv manually — use `uv run`.

## Start the dev server

```bash
uv run uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

## Install / sync dependencies

```bash
uv sync
```

## Add a dependency

```bash
uv add <package>
```

## Run database migrations

```bash
uv run alembic upgrade head
```

## Run tests

```bash
uv run pytest
```

## Lint

```bash
uv run ruff check .
uv run ruff format .
```
