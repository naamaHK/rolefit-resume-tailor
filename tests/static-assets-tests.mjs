import assert from "node:assert/strict";
import { publicAssetPath } from "../server/static-assets.mjs";

const root = "/tmp/rolefit-public-assets";
assert.equal(publicAssetPath(root, "/"), `${root}/index.html`);
assert.equal(publicAssetPath(root, "/src/styles.css"), `${root}/src/styles.css`);
assert.equal(publicAssetPath(root, "/src/resume/workflow-client.js"), `${root}/src/resume/workflow-client.js`);
assert.equal(publicAssetPath(root, "/vendor/pdfjs/pdf.min.mjs"), `${root}/vendor/pdfjs/pdf.min.mjs`);
assert.equal(publicAssetPath(root, "/vendor/pdfjs/pdf.worker.min.mjs"), `${root}/vendor/pdfjs/pdf.worker.min.mjs`);

for (const path of [
  "/.git/config", "/.env", "/.legacy/RoleFit_resume/.git/config",
  "/server.mjs", "/server/workflow/state.mjs", "/evaluation/fixtures/001-product-data-analyst-simulation.json",
  "/prompts/master_prompt.md", "/README.md", "/src/../.env", "/src/%2e%2e/.env",
  "/src/%5c..%5c.env", "/src/.private.js", "/vendor/pdfjs/not-an-asset.mjs", "/src/x.json", "/%ZZ"
]) assert.equal(publicAssetPath(root, path), null, `${path} should not be public`);

console.log("Static asset boundary tests passed");
