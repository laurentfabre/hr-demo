import { useQuery, useSuspenseQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseSuspenseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
export class ApiError extends Error {
    status: number;
    statusText: string;
    body: unknown;
    constructor(status: number, statusText: string, body: unknown){
        super(`HTTP ${status}: ${statusText}`);
        this.name = "ApiError";
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}
export type AccessCheckIn = {
    request: "individual_risk" | "candidate_ranking" | "salary_details";
} & {
};
export interface AccessCheckOut {
    audit_id: string;
    detail: string;
}
export interface ActionOut {
    created_at: string;
    id: string;
    option_id: string;
    rationale: string;
    review_note?: string | null;
    state: "proposed" | "reviewed" | "approved" | "rejected" | "committed" | "reflected";
    updated_at: string;
    version: number;
}
export type AlternativeCost = {
    id: "hr_suite" | "bi" | "internal" | "databricks";
    implementation_eur: number;
    monthly_cash_benefit_eur: number;
    monthly_hours_released: number;
    monthly_operations_hours: number;
    monthly_platform_eur: number;
    time_to_value_months: number;
} & {
};
export type AssistantIn = {
    language: "fr" | "en";
    message: string;
    preview_persona: "cpo" | "hrbp" | "ta" | "analyst";
    route: string;
} & {
};
export interface AssistantOut {
    answer: string;
    citations: string[];
    engine: string;
    next_action?: Record<string, string>;
    refused: boolean;
}
export interface AuditOut {
    action: string;
    actor_label: string;
    detail: string;
    event_at: string;
    id: string;
    outcome: string;
}
export type BriefingIn = {
    language: "fr" | "en";
    persona: "cpo" | "hrbp" | "ta" | "analyst";
    refresh?: boolean;
} & {
};
export interface BriefingOut {
    answer?: string;
    cached?: boolean;
    citations?: string[];
    detail?: string | null;
    engine?: "genie_supervisor";
    generated_at?: string | null;
    genie_url?: string | null;
    language: "fr" | "en";
    persona: "cpo" | "hrbp" | "ta" | "analyst";
    response_id?: string | null;
    review_session_id?: string | null;
    snapshot_sha256: string;
    source_tables?: string[];
    status: "ready" | "generating" | "unavailable";
}
export interface CapabilitiesOut {
    action_store: string;
    actions_available: boolean;
    assistant_mode: string;
    dashboard_url?: string | null;
}
export interface CockpitOut {
    actions: ActionOut[];
    as_of: string;
    audit: AuditOut[];
    candidates: Record<string, unknown>[];
    capabilities: CapabilitiesOut;
    cases: Record<string, unknown>[];
    definitions: Record<string, unknown>[];
    freshness: Record<string, string>;
    reference: Record<string, unknown>;
    scenario_id: string;
    session: SessionOut;
    sources: Record<string, unknown>[];
    synthetic: true;
}
export type CommitIn = {
    expected_version: number;
    idempotency_key: string;
} & {
};
export type DecisionIn = {
    decision: "approve" | "reject" | "commit";
    expected_version: number;
    human_confirmed?: boolean;
    note: string;
    proposal_id: string;
} & {
};
export type DnbQuestion = {
    agent?: "supervisor" | "workforce" | "talent" | "retention" | "operations";
    conversation_id?: string | null;
    language?: "fr" | "en";
    message: string;
    month?: "2026-01-01" | "2026-02-01" | "2026-03-01" | "2026-04-01" | "2026-05-01" | "2026-06-01";
    region?: "ALL" | "AMER" | "EMEA" | "APJ";
    scenario?: "baseline" | "hiring_surge" | "balanced";
} & {
};
export type ExplainIn = {
    entity?: "ALL" | "FR" | "DE" | "GB" | "US" | "IN" | "JP";
    language?: "fr" | "en";
    period?: "2026-07" | "2026-08" | "2026-09";
    question: string;
    run_id: string;
    story?: "capacity" | "harmonization" | "self_service";
} & {
};
export type FileBatchIn = {
    batch_key: string;
    expected_revision: number;
    rows: SourceRow[];
    run_id: string;
    synthetic: true;
} & {
};
export type GenieQuestionIn = {
    conversation_id?: string | null;
    language?: "fr" | "en";
    message: string;
} & {
};
export interface HTTPValidationError {
    detail?: ValidationError[];
}
export type IngestIn = {
    batch: "demand_shift" | "invalid_source" | "recover";
    batch_key: string;
    expected_revision: number;
    run_id: string;
} & {
};
export type PlanIn = {
    budget_eur?: number;
    entity?: "ALL" | "FR" | "DE" | "GB" | "US" | "IN" | "JP";
    expected_revision: number;
    hire?: number;
    hire_cost_eur?: number;
    hire_effect_pct?: number;
    period?: "2026-07" | "2026-08" | "2026-09";
    rationale: string;
    redeploy?: number;
    redeploy_cost_eur?: number;
    redeploy_effect_pct?: number;
    run_id: string;
    story?: "capacity" | "harmonization" | "self_service";
} & {
};
export type ProposalIn = {
    option_id: "blended" | "do_nothing" | "recruit_only";
    rationale: string;
} & {
};
export type ReviewIn = {
    decision: "approve" | "reject";
    expected_version: number;
    note: string;
} & {
};
export type RunIn = {
    label: string;
    scale?: number;
} & {
};
export type Scope = {
    entity?: "ALL" | "FR" | "DE" | "GB" | "US" | "IN" | "JP";
    period?: "2026-07" | "2026-08" | "2026-09";
    run_id: string;
    story?: "capacity" | "harmonization" | "self_service";
} & {
};
export interface SessionOut {
    authentication_mode: string;
    permissions: string[];
    persona_preview_grants_access?: false;
    principal_label: string;
}
export type SourceRow = {
    cases: number;
    centre: number;
    contractors: number;
    currency: "EUR" | "GBP" | "USD" | "INR" | "JPY";
    demand_centi: number;
    department: "Engineering" | "Operations" | "Sales" | "People";
    employees: number;
    entity: "FR" | "DE" | "GB" | "US" | "IN" | "JP";
    fte_centi: number;
    key: string;
    local_cost_cents: number;
    overdue: number;
    period: "2026-07" | "2026-08" | "2026-09";
    source: "HRIS-A" | "HRIS-B" | "HRIS-C";
    survey_responses: number;
} & {
};
export interface ValidationError {
    ctx?: Record<string, unknown>;
    input?: unknown;
    loc: (string | number)[];
    msg: string;
    type: string;
}
export type ValueIn = {
    alternatives: AlternativeCost[];
    assumptions_source?: string;
    horizon_months?: number;
    hourly_cost_eur?: number;
    realization_high_pct?: number;
    realization_low_pct?: number;
} & {
};
export interface VersionOut {
    version: string;
}
export const accessCheck = async (data: AccessCheckIn, options?: RequestInit): Promise<{
    data: AccessCheckOut;
}> =>{
    const res = await fetch("/api/access-check", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useAccessCheck(options?: {
    mutation?: UseMutationOptions<{
        data: AccessCheckOut;
    }, ApiError, AccessCheckIn>;
}) {
    return useMutation({
        mutationFn: (data)=>accessCheck(data),
        ...options?.mutation
    });
}
export const proposeAction = async (data: ProposalIn, options?: RequestInit): Promise<{
    data: ActionOut;
}> =>{
    const res = await fetch("/api/actions", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useProposeAction(options?: {
    mutation?: UseMutationOptions<{
        data: ActionOut;
    }, ApiError, ProposalIn>;
}) {
    return useMutation({
        mutationFn: (data)=>proposeAction(data),
        ...options?.mutation
    });
}
export interface CommitActionParams {
    action_id: string;
}
export const commitAction = async (params: CommitActionParams, data: CommitIn, options?: RequestInit): Promise<{
    data: ActionOut;
}> =>{
    const res = await fetch(`/api/actions/${params.action_id}/commit`, {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useCommitAction(options?: {
    mutation?: UseMutationOptions<{
        data: ActionOut;
    }, ApiError, {
        params: CommitActionParams;
        data: CommitIn;
    }>;
}) {
    return useMutation({
        mutationFn: (vars)=>commitAction(vars.params, vars.data),
        ...options?.mutation
    });
}
export interface ReviewActionParams {
    action_id: string;
}
export const reviewAction = async (params: ReviewActionParams, data: ReviewIn, options?: RequestInit): Promise<{
    data: ActionOut;
}> =>{
    const res = await fetch(`/api/actions/${params.action_id}/review`, {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useReviewAction(options?: {
    mutation?: UseMutationOptions<{
        data: ActionOut;
    }, ApiError, {
        params: ReviewActionParams;
        data: ReviewIn;
    }>;
}) {
    return useMutation({
        mutationFn: (vars)=>reviewAction(vars.params, vars.data),
        ...options?.mutation
    });
}
export interface AgentBriefingParams {
    persona?: "cpo" | "hrbp" | "ta" | "analyst";
    language?: "fr" | "en";
}
export const agentBriefing = async (params?: AgentBriefingParams, options?: RequestInit): Promise<{
    data: BriefingOut;
}> =>{
    const searchParams = new URLSearchParams();
    if (params?.persona != null) searchParams.set("persona", String(params?.persona));
    if (params?.language != null) searchParams.set("language", String(params?.language));
    const queryString = searchParams.toString();
    const url = queryString ? `/api/agents/briefing?${queryString}` : "/api/agents/briefing";
    const res = await fetch(url, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const agentBriefingKey = (params?: AgentBriefingParams)=>{
    return [
        "/api/agents/briefing",
        params
    ] as const;
};
export function useAgentBriefing<TData = {
    data: BriefingOut;
}>(options?: {
    params?: AgentBriefingParams;
    query?: Omit<UseQueryOptions<{
        data: BriefingOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: agentBriefingKey(options?.params),
        queryFn: ()=>agentBriefing(options?.params),
        ...options?.query
    });
}
export function useAgentBriefingSuspense<TData = {
    data: BriefingOut;
}>(options?: {
    params?: AgentBriefingParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: BriefingOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: agentBriefingKey(options?.params),
        queryFn: ()=>agentBriefing(options?.params),
        ...options?.query
    });
}
export const refreshAgentBriefing = async (data: BriefingIn, options?: RequestInit): Promise<{
    data: BriefingOut;
}> =>{
    const res = await fetch("/api/agents/briefing", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useRefreshAgentBriefing(options?: {
    mutation?: UseMutationOptions<{
        data: BriefingOut;
    }, ApiError, BriefingIn>;
}) {
    return useMutation({
        mutationFn: (data)=>refreshAgentBriefing(data),
        ...options?.mutation
    });
}
export const askAssistant = async (data: AssistantIn, options?: RequestInit): Promise<{
    data: AssistantOut;
}> =>{
    const res = await fetch("/api/assistant", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useAskAssistant(options?: {
    mutation?: UseMutationOptions<{
        data: AssistantOut;
    }, ApiError, AssistantIn>;
}) {
    return useMutation({
        mutationFn: (data)=>askAssistant(data),
        ...options?.mutation
    });
}
export const cockpit = async (options?: RequestInit): Promise<{
    data: CockpitOut;
}> =>{
    const res = await fetch("/api/cockpit", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const cockpitKey = ()=>{
    return [
        "/api/cockpit"
    ] as const;
};
export function useCockpit<TData = {
    data: CockpitOut;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: CockpitOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: cockpitKey(),
        queryFn: ()=>cockpit(),
        ...options?.query
    });
}
export function useCockpitSuspense<TData = {
    data: CockpitOut;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: CockpitOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: cockpitKey(),
        queryFn: ()=>cockpit(),
        ...options?.query
    });
}
export const currentUser = async (options?: RequestInit): Promise<{
    data: SessionOut;
}> =>{
    const res = await fetch("/api/current-user", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const currentUserKey = ()=>{
    return [
        "/api/current-user"
    ] as const;
};
export function useCurrentUser<TData = {
    data: SessionOut;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: SessionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: currentUserKey(),
        queryFn: ()=>currentUser(),
        ...options?.query
    });
}
export function useCurrentUserSuspense<TData = {
    data: SessionOut;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: SessionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: currentUserKey(),
        queryFn: ()=>currentUser(),
        ...options?.query
    });
}
export const dnbAsk = async (data: DnbQuestion, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/dnb/ask", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useDnbAsk(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, DnbQuestion>;
}) {
    return useMutation({
        mutationFn: (data)=>dnbAsk(data),
        ...options?.mutation
    });
}
export const dnbCatalog = async (options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/dnb/catalog", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const dnbCatalogKey = ()=>{
    return [
        "/api/dnb/catalog"
    ] as const;
};
export function useDnbCatalog<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: dnbCatalogKey(),
        queryFn: ()=>dnbCatalog(),
        ...options?.query
    });
}
export function useDnbCatalogSuspense<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: dnbCatalogKey(),
        queryFn: ()=>dnbCatalog(),
        ...options?.query
    });
}
export interface DocumentParams {
    document_id: string;
}
export const document = async (params: DocumentParams, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch(`/api/documents/${params.document_id}`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const documentKey = (params?: DocumentParams)=>{
    return [
        "/api/documents/{document_id}",
        params
    ] as const;
};
export function useDocument<TData = {
    data: unknown;
}>(options: {
    params: DocumentParams;
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: documentKey(options.params),
        queryFn: ()=>document(options.params),
        ...options?.query
    });
}
export function useDocumentSuspense<TData = {
    data: unknown;
}>(options: {
    params: DocumentParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: documentKey(options.params),
        queryFn: ()=>document(options.params),
        ...options?.query
    });
}
export const enterpriseCatalog = async (options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/catalog", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const enterpriseCatalogKey = ()=>{
    return [
        "/api/enterprise/catalog"
    ] as const;
};
export function useEnterpriseCatalog<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: enterpriseCatalogKey(),
        queryFn: ()=>enterpriseCatalog(),
        ...options?.query
    });
}
export function useEnterpriseCatalogSuspense<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: enterpriseCatalogKey(),
        queryFn: ()=>enterpriseCatalog(),
        ...options?.query
    });
}
export const enterpriseDecide = async (data: DecisionIn, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/decisions", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterpriseDecide(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, DecisionIn>;
}) {
    return useMutation({
        mutationFn: (data)=>enterpriseDecide(data),
        ...options?.mutation
    });
}
export interface EnterpriseEvidenceParams {
    run_id: string;
}
export const enterpriseEvidence = async (params: EnterpriseEvidenceParams, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch(`/api/enterprise/evidence/${params.run_id}`, {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const enterpriseEvidenceKey = (params?: EnterpriseEvidenceParams)=>{
    return [
        "/api/enterprise/evidence/{run_id}",
        params
    ] as const;
};
export function useEnterpriseEvidence<TData = {
    data: unknown;
}>(options: {
    params: EnterpriseEvidenceParams;
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: enterpriseEvidenceKey(options.params),
        queryFn: ()=>enterpriseEvidence(options.params),
        ...options?.query
    });
}
export function useEnterpriseEvidenceSuspense<TData = {
    data: unknown;
}>(options: {
    params: EnterpriseEvidenceParams;
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: enterpriseEvidenceKey(options.params),
        queryFn: ()=>enterpriseEvidence(options.params),
        ...options?.query
    });
}
export const enterpriseExplain = async (data: ExplainIn, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/explain", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterpriseExplain(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, ExplainIn>;
}) {
    return useMutation({
        mutationFn: (data)=>enterpriseExplain(data),
        ...options?.mutation
    });
}
export const enterpriseIngest = async (data: IngestIn, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/ingest", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterpriseIngest(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, IngestIn>;
}) {
    return useMutation({
        mutationFn: (data)=>enterpriseIngest(data),
        ...options?.mutation
    });
}
export const enterpriseIngestFile = async (data: FileBatchIn, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/ingest-file", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterpriseIngestFile(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, FileBatchIn>;
}) {
    return useMutation({
        mutationFn: (data)=>enterpriseIngestFile(data),
        ...options?.mutation
    });
}
export const enterprisePropose = async (data: PlanIn, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/proposals", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterprisePropose(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, PlanIn>;
}) {
    return useMutation({
        mutationFn: (data)=>enterprisePropose(data),
        ...options?.mutation
    });
}
export const enterpriseCreateRun = async (data: RunIn, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/runs", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterpriseCreateRun(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, RunIn>;
}) {
    return useMutation({
        mutationFn: (data)=>enterpriseCreateRun(data),
        ...options?.mutation
    });
}
export const enterpriseSnapshot = async (data: Scope, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/snapshot", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterpriseSnapshot(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, Scope>;
}) {
    return useMutation({
        mutationFn: (data)=>enterpriseSnapshot(data),
        ...options?.mutation
    });
}
export const enterpriseSourceTemplate = async (options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/source-template", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const enterpriseSourceTemplateKey = ()=>{
    return [
        "/api/enterprise/source-template"
    ] as const;
};
export function useEnterpriseSourceTemplate<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: enterpriseSourceTemplateKey(),
        queryFn: ()=>enterpriseSourceTemplate(),
        ...options?.query
    });
}
export function useEnterpriseSourceTemplateSuspense<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: enterpriseSourceTemplateKey(),
        queryFn: ()=>enterpriseSourceTemplate(),
        ...options?.query
    });
}
export const enterpriseToolManifest = async (options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/tools/manifest", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const enterpriseToolManifestKey = ()=>{
    return [
        "/api/enterprise/tools/manifest"
    ] as const;
};
export function useEnterpriseToolManifest<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: enterpriseToolManifestKey(),
        queryFn: ()=>enterpriseToolManifest(),
        ...options?.query
    });
}
export function useEnterpriseToolManifestSuspense<TData = {
    data: unknown;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: unknown;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: enterpriseToolManifestKey(),
        queryFn: ()=>enterpriseToolManifest(),
        ...options?.query
    });
}
export const enterpriseReadTool = async (data: Scope, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/tools/query", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterpriseReadTool(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, Scope>;
}) {
    return useMutation({
        mutationFn: (data)=>enterpriseReadTool(data),
        ...options?.mutation
    });
}
export const enterpriseValue = async (data: ValueIn, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/enterprise/value", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useEnterpriseValue(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, ValueIn>;
}) {
    return useMutation({
        mutationFn: (data)=>enterpriseValue(data),
        ...options?.mutation
    });
}
export const askGenie = async (data: GenieQuestionIn, options?: RequestInit): Promise<{
    data: unknown;
}> =>{
    const res = await fetch("/api/genie/ask", {
        ...options,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export function useAskGenie(options?: {
    mutation?: UseMutationOptions<{
        data: unknown;
    }, ApiError, GenieQuestionIn>;
}) {
    return useMutation({
        mutationFn: (data)=>askGenie(data),
        ...options?.mutation
    });
}
export const version = async (options?: RequestInit): Promise<{
    data: VersionOut;
}> =>{
    const res = await fetch("/api/version", {
        ...options,
        method: "GET"
    });
    if (!res.ok) {
        const body = await res.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(body);
        } catch  {
            parsed = body;
        }
        throw new ApiError(res.status, res.statusText, parsed);
    }
    return {
        data: await res.json()
    };
};
export const versionKey = ()=>{
    return [
        "/api/version"
    ] as const;
};
export function useVersion<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
export function useVersionSuspense<TData = {
    data: VersionOut;
}>(options?: {
    query?: Omit<UseSuspenseQueryOptions<{
        data: VersionOut;
    }, ApiError, TData>, "queryKey" | "queryFn">;
}) {
    return useSuspenseQuery({
        queryKey: versionKey(),
        queryFn: ()=>version(),
        ...options?.query
    });
}
