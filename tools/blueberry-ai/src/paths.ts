import path from "node:path";

export class PathEscapeError extends Error {
  constructor(target: string, root: string) {
    super(`Refusing to touch ${target}: outside the workspace root ${root}`);
    this.name = "PathEscapeError";
  }
}

export const workspaceRoot = (): string => process.env.BLUEBERRY_AI_ROOT ?? process.cwd();

/**
 * Resolve `candidate` and assert it stays inside `root`. The model chooses these
 * paths, so a relative path containing `..` is an expected input, not an edge case.
 */
export function resolveInside(candidate: string, root = workspaceRoot()): string {
  const absRoot = path.resolve(root);
  const abs = path.resolve(absRoot, candidate);
  const rel = path.relative(absRoot, abs);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new PathEscapeError(candidate, absRoot);
  }
  return abs;
}
