"""Bounded enterprise commands and transparent value calculations."""
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal
from pydantic import Field, model_validator
from .models import StrictInput


class RunIn(StrictInput):
    label: str = Field(min_length=1, max_length=100)
    scale: int = Field(default=1, ge=1, le=1000, strict=True)


class Scope(StrictInput):
    run_id: str = Field(pattern=r"^[a-f0-9-]{36}$")
    period: Literal["2026-07", "2026-08", "2026-09"] = "2026-09"
    entity: Literal["ALL", "FR", "DE", "GB", "US", "IN", "JP"] = "ALL"
    story: Literal["capacity", "harmonization", "self_service"] = "capacity"


class IngestIn(StrictInput):
    run_id: str = Field(pattern=r"^[a-f0-9-]{36}$")
    expected_revision: int = Field(ge=1, strict=True)
    batch_key: str = Field(min_length=8, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    batch: Literal["demand_shift", "invalid_source", "recover"]


class SourceRow(StrictInput):
    key: str = Field(min_length=5, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    entity: Literal["FR", "DE", "GB", "US", "IN", "JP"]
    period: Literal["2026-07", "2026-08", "2026-09"]
    department: Literal["Engineering", "Operations", "Sales", "People"]
    centre: int = Field(ge=0, le=999, strict=True)
    source: Literal["HRIS-A", "HRIS-B", "HRIS-C"]
    employees: int = Field(ge=0, le=10000000, strict=True)
    contractors: int = Field(ge=0, le=10000000, strict=True)
    fte_centi: int = Field(ge=0, le=1000000000, strict=True)
    demand_centi: int = Field(ge=0, le=1000000000, strict=True)
    local_cost_cents: int = Field(ge=0, le=1000000000000, strict=True)
    currency: Literal["EUR", "GBP", "USD", "INR", "JPY"]
    cases: int = Field(ge=0, le=10000000, strict=True)
    overdue: int = Field(ge=0, le=10000000, strict=True)
    survey_responses: int = Field(ge=0, le=10000000, strict=True)


class FileBatchIn(StrictInput):
    run_id: str = Field(pattern=r"^[a-f0-9-]{36}$")
    expected_revision: int = Field(ge=1, strict=True)
    batch_key: str = Field(min_length=8, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    rows: list[SourceRow] = Field(min_length=1, max_length=5000)
    synthetic: Literal[True]


class PlanIn(Scope):
    expected_revision: int = Field(ge=1, strict=True)
    hire: int = Field(default=8, ge=0, le=1000, strict=True)
    redeploy: int = Field(default=12, ge=0, le=1000, strict=True)
    budget_eur: int = Field(default=1200000, ge=0, le=100000000, strict=True)
    hire_cost_eur: int = Field(default=65000, ge=0, le=500000, strict=True)
    redeploy_cost_eur: int = Field(default=18000, ge=0, le=500000, strict=True)
    hire_effect_pct: int = Field(default=50, ge=0, le=100, strict=True)
    redeploy_effect_pct: int = Field(default=80, ge=0, le=100, strict=True)
    rationale: str = Field(min_length=10, max_length=600)


class DecisionIn(StrictInput):
    proposal_id: str = Field(pattern=r"^[a-f0-9-]{36}$")
    expected_version: int = Field(ge=1, strict=True)
    decision: Literal["approve", "reject", "commit"]
    note: str = Field(min_length=4, max_length=600)
    human_confirmed: bool = Field(default=False, strict=True)


class ExplainIn(Scope):
    language: Literal["fr", "en"] = "en"
    question: str = Field(min_length=1, max_length=1500)


class AlternativeCost(StrictInput):
    id: Literal["hr_suite", "bi", "internal", "databricks"]
    implementation_eur: int = Field(ge=0, le=100000000, strict=True)
    monthly_platform_eur: int = Field(ge=0, le=10000000, strict=True)
    monthly_operations_hours: int = Field(ge=0, le=100000, strict=True)
    monthly_cash_benefit_eur: int = Field(ge=0, le=10000000, strict=True)
    monthly_hours_released: int = Field(ge=0, le=100000, strict=True)
    time_to_value_months: int = Field(ge=0, le=36, strict=True)


class ValueIn(StrictInput):
    hourly_cost_eur: int = Field(default=70, ge=0, le=10000, strict=True)
    horizon_months: int = Field(default=12, ge=1, le=36, strict=True)
    realization_low_pct: int = Field(default=30, ge=0, le=100, strict=True)
    realization_high_pct: int = Field(default=70, ge=0, le=100, strict=True)
    assumptions_source: str = Field(default="Illustrative assumptions; replace with customer estimates", min_length=5, max_length=300)
    alternatives: list[AlternativeCost] = Field(min_length=4, max_length=4)

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.realization_low_pct > self.realization_high_pct:
            raise ValueError("Low realization exceeds high realization")
        if {a.id for a in self.alternatives} != {"hr_suite", "bi", "internal", "databricks"}:
            raise ValueError("Provide each comparison alternative exactly once")
        return self


def value_case(body):
    result = []
    for a in body.alternatives:
        recurring = a.monthly_platform_eur + a.monthly_operations_hours * body.hourly_cost_eur
        cost = a.implementation_eur + body.horizon_months * recurring
        productive_months = max(0, body.horizon_months - a.time_to_value_months)
        scenarios = []
        for rate in (body.realization_low_pct, body.realization_high_pct):
            cash = int((Decimal(a.monthly_cash_benefit_eur * productive_months * rate) / 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
            hours = round(a.monthly_hours_released * productive_months * rate / 100, 1)
            monthly_net = Decimal(a.monthly_cash_benefit_eur * rate) / 100 - recurring
            payback = float(Decimal(a.implementation_eur + recurring * a.time_to_value_months) / monthly_net + a.time_to_value_months) if monthly_net > 0 else None
            scenarios.append(dict(realization_pct=rate, cash_benefit_eur=cash, net_cash_eur=cash-cost,
                                  hours_released=hours, capacity_value_eur=round(hours*body.hourly_cost_eur),
                                  roi_pct=round((cash-cost)*100/cost, 1) if cost else None,
                                  payback_months=round(payback, 1) if payback is not None else None))
        result.append(dict(id=a.id, tco_eur=cost, productive_months=productive_months, scenarios=scenarios))
    return dict(results=result, assumptions=body.model_dump(), currency="EUR", modeled=True,
                cash_excludes_released_time=True, measured_platform_cost=False)
