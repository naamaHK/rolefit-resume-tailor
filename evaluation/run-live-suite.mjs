import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runLiveFixture } from "./live-flow-runner.mjs";

const [fixtureDirectory = "evaluation/fixtures", outputPath = ""] = process.argv.slice(2);
const fixturePaths = (await readdir(fixtureDirectory))
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => path.join(fixtureDirectory, name));

if (!fixturePaths.length) throw new Error(`No JSON fixtures found in ${fixtureDirectory}.`);

const results = [];
for (const fixturePath of fixturePaths) {
  console.log(`Running ${fixturePath} through the live RoleFit web flow...`);
  try {
    results.push(await runLiveFixture(fixturePath));
  } catch (error) {
    results.push({ fixture_path: fixturePath, result: "ERROR", error: error.message });
  }
}

const summary = {
  runner: "live-web-suite",
  timestamp: new Date().toISOString(),
  total: results.length,
  passed: results.filter((item) => item.result === "PASS").length,
  rejected: results.filter((item) => item.result === "REJECT").length,
  errors: results.filter((item) => item.result === "ERROR").length,
  results
};

if (outputPath) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
}
console.log(JSON.stringify(summary, null, 2));
