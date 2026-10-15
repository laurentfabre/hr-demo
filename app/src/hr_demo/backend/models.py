from pydantic import BaseModel
from pydantic import ConfigDict, Field
from typing import Any, Literal
from .. import __version__


class VersionOut(BaseModel):
    version: str

    @classmethod
    def from_metadata(cls):
        return cls(version=__version__)


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class SessionOut(BaseModel):
    principal_label: str
    authentication_mode: str
    permissions: list[str]
    persona_preview_grants_access: Literal[False] = False


class ActionOut(BaseModel):
    id: str
    option_id: str
    state: Literal["proposed", "reviewed", "approved", "rejected", "committed", "reflected"]
    version: int
    rationale: str
    created_at: str
    updated_at: str
    review_note: str | None = None


class AuditOut(BaseModel):
    id: str
    event_at: str
    action: str
    outcome: str
    actor_label: str
    detail: str


class CapabilitiesOut(BaseModel):
    actions_available: bool
    action_store: str
    assistant_mode: str
    dashboard_url: str | None = None


class CockpitOut(BaseModel):
    scenario_id: str
    as_of: str
    synthetic: Literal[True]
    reference: dict[str, Any]
    session: SessionOut
    candidates: list[dict[str, Any]]
    cases: list[dict[str, Any]]
    sources: list[dict[str, Any]]
    definitions: list[dict[str, Any]]
    actions: list[ActionOut]
    audit: list[AuditOut]
    capabilities: CapabilitiesOut
    freshness: dict[str, str]


class ProposalIn(StrictInput):
    option_id: Literal["blended", "do_nothing", "recruit_only"]
    rationale: str = Field(min_length=4, max_length=600)


class ReviewIn(StrictInput):
    decision: Literal["approve", "reject"]
    expected_version: int = Field(ge=1)
    note: str = Field(min_length=4, max_length=600)


class CommitIn(StrictInput):
    expected_version: int = Field(ge=1)
    idempotency_key: str = Field(min_length=16, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")


class AccessCheckIn(StrictInput):
    request: Literal["individual_risk", "candidate_ranking", "salary_details"]


class AssistantIn(StrictInput):
    message: str = Field(min_length=1, max_length=2000)
    route: str = Field(max_length=100)
    preview_persona: Literal["cpo", "hrbp", "ta", "analyst"]
    language: Literal["fr", "en"]


class AssistantOut(BaseModel):
    answer: str
    citations: list[str]
    engine: str
    refused: bool
    next_action: dict[str, str] = Field(default_factory=dict)


class GenieQuestionIn(StrictInput):
    message: str = Field(min_length=1, max_length=2000)
    language: Literal["fr", "en"] = "fr"
    conversation_id: str | None = Field(default=None, max_length=64, pattern=r"^[a-fA-F0-9-]+$")


class BriefingIn(StrictInput):
    persona: Literal["cpo", "hrbp", "ta", "analyst"]
    language: Literal["fr", "en"]
    refresh: bool = False


class BriefingOut(BaseModel):
    status: Literal["ready", "generating", "unavailable"]
    persona: Literal["cpo", "hrbp", "ta", "analyst"]
    language: Literal["fr", "en"]
    answer: str = ""
    engine: Literal["genie_supervisor"] = "genie_supervisor"
    generated_at: str | None = None
    genie_url: str | None = None
    citations: list[str] = Field(default_factory=list)
    source_tables: list[str] = Field(default_factory=list)
    cached: bool = False
    detail: str | None = None
    snapshot_sha256: str
    response_id: str | None = None
    review_session_id: str | None = None


class AccessCheckOut(BaseModel):
    detail: str
    audit_id: str
