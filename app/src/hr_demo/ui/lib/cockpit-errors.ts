export function requestError(error: unknown): string {
  const item = error as { status?: number; body?: { detail?: string | { message?: string } }; response?: { status?: number; data?: { detail?: string | { message?: string } } }; message?: string };
  const detail = item.body?.detail || item.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && typeof detail.message === "string") return detail.message;
  return item.message || "Request failed";
}
export function requestStatus(error: unknown): number | undefined {
  const item = error as { status?: number; response?: { status?: number } };
  return item.status || item.response?.status;
}
