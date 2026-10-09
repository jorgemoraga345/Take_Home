/** Returns whether a database error or its wrapped cause is a unique violation. */
export function isUniqueViolation(error: unknown): boolean {
  const visited = new Set<object>();
  let current: unknown = error;

  while (typeof current === 'object' && current !== null && !visited.has(current)) {
    visited.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };

    if (candidate.code === '23505') {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}
