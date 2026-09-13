"use client";

import dynamic from "next/dynamic";

/**
 * The optional Agentation feedback toolbar. RootLayout mounts it only when
 * ENABLE_AGENTATION=true in development and the local MCP server is available.
 *
 * Annotations made here are posted to the local agentation-mcp HTTP server,
 * which the coding agent then reads over MCP — so pointing at a piece of copy
 * on the page and saying what is wrong with it becomes a task the agent picks
 * up, rather than a message someone has to transcribe into a prompt.
 *
 * The NODE_ENV check is doing real work, not being cautious for its own sake.
 * `agentation` is a devDependency, so a production install (`npm ci --omit=dev`)
 * will not have it on disk at all. Next replaces process.env.NODE_ENV at build
 * time, which collapses this ternary to `() => null` in a production build and
 * lets the bundler drop the import entirely — without that, a prod build would
 * try to resolve a package that is not there and fail.
 *
 * ssr:false because the toolbar measures real DOM geometry to place its pins;
 * there is nothing for it to do on the server.
 */
const Toolbar =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((m) => ({ default: m.Agentation })), {
        ssr: false,
      })
    : () => null;

export function DevAnnotator() {
  // 4747 is agentation-mcp's default HTTP port. Stated rather than defaulted so
  // that if the server is started on another port, there is one obvious place
  // to change it — and .mcp.json at the repo root is the other half of this.
  return <Toolbar endpoint="http://localhost:4747" />;
}
