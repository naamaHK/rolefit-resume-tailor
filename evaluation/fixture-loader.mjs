import { readFile } from "node:fs/promises";
import path from "node:path";

function mergeFixture(base, variant) {
  return {
    ...base,
    ...variant,
    profile: variant.profile || base.profile,
    rolefit_input: { ...base.rolefit_input, ...variant.rolefit_input },
    oracle: {
      ...base.oracle,
      ...variant.oracle,
      rules: { ...base.oracle?.rules, ...variant.oracle?.rules },
      requirements: variant.oracle?.requirements || base.oracle?.requirements,
      claimable_skills: variant.oracle?.claimable_skills || base.oracle?.claimable_skills
    }
  };
}

export async function loadEvaluationFixture(fixturePath) {
  const raw = JSON.parse(await readFile(fixturePath, "utf8"));
  if (!raw.base_fixture) return raw;

  const base = await loadEvaluationFixture(path.resolve(path.dirname(fixturePath), raw.base_fixture));
  return mergeFixture(base, raw);
}
