import { readFile } from "node:fs/promises";
import path from "node:path";

function mergeFixture(base, variant) {
  return {
    ...base,
    ...variant,
    profile: {
      ...base.profile,
      ...variant.profile,
      basic_info: { ...base.profile?.basic_info, ...variant.profile?.basic_info },
      skills: { ...base.profile?.skills, ...variant.profile?.skills },
      other: { ...base.profile?.other, ...variant.profile?.other },
      experience: variant.profile?.experience || base.profile?.experience,
      education: variant.profile?.education || base.profile?.education,
      certifications: variant.profile?.certifications || base.profile?.certifications,
      languages: variant.profile?.languages || base.profile?.languages
    },
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
