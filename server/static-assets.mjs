import { join } from "node:path";

// Only browser assets belong on the HTTP surface. In particular, evaluation
// profiles, prompts, environment files, Git history, and archives are private.
export function publicAssetPath(rootDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded === "/") decoded = "/index.html";
  if (!decoded.startsWith("/") || decoded.includes("\\") || decoded.includes("\0")) return null;
  const segments = decoded.slice(1).split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.startsWith("."))) return null;
  const asset = segments.join("/");
  if (asset !== "index.html"
    && !/^src\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:js|css)$/.test(asset)
    && !["vendor/pdfjs/pdf.min.mjs", "vendor/pdfjs/pdf.worker.min.mjs"].includes(asset)) return null;
  return join(rootDir, asset);
}
