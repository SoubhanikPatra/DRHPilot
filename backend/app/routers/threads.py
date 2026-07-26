"""
routers/threads.py — Chat thread CRUD + stubbed SSE stream.

Endpoints:
    GET    /api/threads                     list user's threads
    POST   /api/threads                     create thread
    GET    /api/threads/{id}/messages       load message history
    DELETE /api/threads/{id}               delete thread
    POST   /api/threads/{id}/stream        stubbed streaming reply
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.database.models import ChatMessage, ChatThread, Profile
from app.database.session import get_db

router = APIRouter(prefix="/api/threads", tags=["threads"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _ensure_profile(user: dict[str, Any], db: AsyncSession) -> uuid.UUID:
    """Upsert a row in users mirroring the Supabase auth user.

    Supabase auth.users and our public.users are separate tables.
    On first request we create the profile row; subsequent calls are no-ops.
    """
    user_id = uuid.UUID(user["id"])
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = Profile(id=user_id, email=user["email"])
        db.add(profile)
        await db.commit()
    return user_id


async def _get_thread_or_403(
    thread_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> ChatThread:
    result = await db.execute(select(ChatThread).where(ChatThread.id == thread_id))
    thread = result.scalar_one_or_none()
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    if thread.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return thread


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ThreadOut(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: uuid.UUID
    thread_id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateThreadIn(BaseModel):
    title: str = "New conversation"


class SendMessageIn(BaseModel):
    content: str


# ---------------------------------------------------------------------------
# GET /api/threads
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ThreadOut])
async def list_threads(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ChatThread]:
    user_id = await _ensure_profile(user, db)
    result = await db.execute(
        select(ChatThread)
        .where(ChatThread.user_id == user_id)
        .order_by(ChatThread.updated_at.desc())
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# POST /api/threads
# ---------------------------------------------------------------------------

@router.post("", response_model=ThreadOut, status_code=status.HTTP_201_CREATED)
async def create_thread(
    body: CreateThreadIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ChatThread:
    user_id = await _ensure_profile(user, db)
    thread = ChatThread(user_id=user_id, title=body.title)
    db.add(thread)
    await db.commit()
    await db.refresh(thread)
    return thread


# ---------------------------------------------------------------------------
# GET /api/threads/{id}/messages
# ---------------------------------------------------------------------------

@router.get("/{thread_id}/messages", response_model=list[MessageOut])
async def get_messages(
    thread_id: uuid.UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ChatMessage]:
    user_id = await _ensure_profile(user, db)
    await _get_thread_or_403(thread_id, user_id, db)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at)
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# DELETE /api/threads/{id}
# ---------------------------------------------------------------------------

@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: uuid.UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    user_id = await _ensure_profile(user, db)
    await _get_thread_or_403(thread_id, user_id, db)
    await db.execute(delete(ChatThread).where(ChatThread.id == thread_id))
    await db.commit()


# ---------------------------------------------------------------------------
# POST /api/threads/{id}/stream — stubbed SSE
# ---------------------------------------------------------------------------

_STUB_REPLY = (
    "This is a stubbed response from DRHPilot. "
    "Once the RAG pipeline is wired up, you'll see grounded answers "
    "with citations from SEC filings here."
)


async def _sse_generator(
    thread_id: uuid.UUID,
    user_message: str,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:  # type: ignore[type-arg]
    # Persist user message
    user_msg = ChatMessage(
        thread_id=thread_id,
        role="user",
        content=user_message,
    )
    db.add(user_msg)
    await db.commit()

    # Stream stub reply word by word
    words = _STUB_REPLY.split()
    accumulated: list[str] = []

    for i, word in enumerate(words):
        chunk = word if i == 0 else f" {word}"
        accumulated.append(chunk)
        payload = json.dumps({"delta": chunk})
        yield f"data: {payload}\n\n"
        await asyncio.sleep(0.05)

    # Persist assembled assistant message
    assistant_msg = ChatMessage(
        thread_id=thread_id,
        role="assistant",
        content="".join(accumulated),
    )
    db.add(assistant_msg)

    # Bump thread updated_at
    thread_result = await db.execute(
        select(ChatThread).where(ChatThread.id == thread_id)
    )
    thread = thread_result.scalar_one()
    thread.updated_at = _utcnow()

    await db.commit()

    # Signal stream end
    yield f"data: {json.dumps({'done': True})}\n\n"


from collections.abc import AsyncGenerator  # noqa: E402 — needed for generator typing


@router.post("/{thread_id}/stream")
async def stream_message(
    thread_id: uuid.UUID,
    body: SendMessageIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    user_id = await _ensure_profile(user, db)
    await _get_thread_or_403(thread_id, user_id, db)

    return StreamingResponse(
        _sse_generator(thread_id, body.content, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering if proxied
        },
    )
