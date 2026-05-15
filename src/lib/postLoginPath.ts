/** Where to send the user after a successful login. */
export function postLoginPath(
  search: URLSearchParams,
  state: unknown,
): string {
  const next = search.get("next");
  if (next?.startsWith("/")) return next;
  const from = (state as { from?: string } | null)?.from;
  if (from?.startsWith("/")) return from;
  return "/app";
}
