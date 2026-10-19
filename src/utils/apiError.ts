/**
 * The API's reason for a rejected request, for showing next to the action that failed.
 * Returns null for errors the API client's interceptor already announces (401, 403, 404, 5xx).
 */
export function apiErrorMessage(error: unknown, fallback = 'That did not work. Please try again.'): string | null {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
  const status = response?.status;
  if (status && (status === 401 || status === 403 || status === 404 || status >= 500)) return null;
  const detail = response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg.replace(/^Value error, /, '');
  return fallback;
}
