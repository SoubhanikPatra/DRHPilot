from __future__ import annotations

import logging
from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer_scheme),
    ],
) -> dict[str, Any]:
    """FastAPI dependency — verify a Supabase-issued JWT and return the user payload.

    Raises 401 for:
    - missing Authorization header
    - malformed / expired token (Supabase returns 401 on its /auth/v1/user endpoint)
    - any unexpected upstream error

    Usage::

        @router.get("/protected")
        async def protected(user: CurrentUser) -> dict:
            return {"user_id": user["id"]}
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_anon_key,
                },
            )
    except httpx.RequestError as exc:
        logger.error("Auth upstream request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to reach auth service",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.status_code != status.HTTP_200_OK:
        logger.error(
            "Unexpected auth response: status=%s body=%s",
            response.status_code,
            response.text[:200],
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user: dict[str, Any] = response.json()
    return user


# Convenient type alias for route signatures
CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
