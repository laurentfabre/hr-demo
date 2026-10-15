"""Identity and permissions are server-owned; persona previews are presentation."""
from dataclasses import dataclass
from functools import lru_cache
import json
import os
import time

from databricks.sdk import WorkspaceClient
from fastapi import Depends, HTTPException, Request


PRESENTER_PERMISSIONS = ("aggregate:read", "candidate:read", "case:read", "action:write", "audit:read")


@dataclass(frozen=True)
class Principal:
    id: str
    label: str
    mode: str
    permissions: tuple[str, ...]


@lru_cache(maxsize=8)
def local_identity(profile: str, interval: int) -> str:
    """Validate the explicitly configured CLI identity; never select a profile."""
    user = WorkspaceClient(profile=profile).current_user.me()
    if not user.id:
        raise ValueError("Authenticated principal unavailable")
    return str(user.id)


def principal(request: Request) -> Principal:
    deployed = bool(os.getenv("DATABRICKS_APP_NAME"))
    if deployed:
        # These headers are injected/overwritten by the authenticated Apps proxy.
        if not request.headers.get("x-forwarded-user", "").strip():
            raise HTTPException(401, "Authenticated Databricks Apps identity required")
        # X-Forwarded-User is an IdP subject, not a workspace SCIM ID. Bind the
        # trusted IdP email to a canonical workspace ID using deployment-owned
        # configuration verified against the explicitly selected SDK identity.
        email = request.headers.get("x-forwarded-email", "").strip().casefold()
        try:
            bindings = json.loads(os.getenv("HR_DEMO_PRESENTER_BINDINGS", "{}"))
            identity = bindings.get(email) if isinstance(bindings, dict) else None
            if identity is None:
                subjects = json.loads(os.getenv("HR_DEMO_SUBJECT_BINDINGS", "{}"))
                identity = subjects.get(request.headers.get("x-forwarded-user", "").strip()) if isinstance(subjects, dict) else None
        except ValueError:
            identity = None
        if not isinstance(identity, str):
            raise HTTPException(403, "This principal has no assigned HR demo scope")
        mode = "databricks_apps"
    else:
        profile = os.getenv("DATABRICKS_CONFIG_PROFILE")
        if os.getenv("HR_DEMO_LOCAL_DEVELOPMENT") != "true" or not profile:
            raise HTTPException(401, "Explicit local development identity configuration required")
        if not request.client or request.client.host not in ("127.0.0.1", "::1", "localhost", "testclient"):
            raise HTTPException(403, "Local development is restricted to loopback")
        try:
            identity = local_identity(profile, int(time.time() // 300))
        except Exception:
            raise HTTPException(401, "Configured Databricks identity could not be verified") from None
        mode = "local_development"
    owners = {value.strip() for value in os.getenv("HR_DEMO_PRESENTER_IDS", "").split(",") if value.strip()}
    if identity not in owners:
        try:
            assigned = json.loads(os.getenv("HR_DEMO_ENTERPRISE_ACCESS", "{}")).get(identity)
        except (ValueError, AttributeError):
            assigned = None
        if isinstance(assigned, dict) and assigned.get("role") in ("reader", "editor"):
            return Principal(identity, "Authenticated Enterprise " + assigned["role"], mode, ("enterprise:read",))
        raise HTTPException(403, "This principal has no assigned HR demo scope")
    return Principal(identity, "Authenticated presenter", mode, PRESENTER_PERMISSIONS)


def require_permission(actor: Principal, permission: str) -> None:
    if permission not in actor.permissions:
        raise HTTPException(403, "Permission denied for the authenticated scope")
