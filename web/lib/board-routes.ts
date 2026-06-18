export function boardIdFromPath(pathname: string | null): string | null {
  if (!pathname) {
    return null;
  }
  const match = pathname.match(/^\/boards\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

export function boardHref(id: string) {
  return `/boards/${id}/`;
}
