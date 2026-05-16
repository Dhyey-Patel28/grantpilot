import path from "node:path";
import { readJson, writeJson } from "./lib/fs.js";
import { scoreGrants } from "./pipeline/scoring.js";

const projectPath = process.argv[2];
if (!projectPath) {
  console.error("Usage: node src/scoreProject.js data/project_profiles/water.json");
  process.exit(1);
}

const root = process.cwd();
const config = await readJson(path.join(root, "data", "config.json"));
const project = await readJson(path.join(root, projectPath));
const grants = await readJson(path.join(root, config.cache.normalized), []);

const scored = scoreGrants(project, grants);
const outPath = path.join(root, "outputs", `scored_${project.project_category}_${Date.now()}.json`);
await writeJson(outPath, scored);

console.log(`Scored ${scored.length} grants for ${project.community_name}.`);
console.log(`Saved: ${outPath}`);
console.log("Top 10:");
for (const g of scored.slice(0, 10)) {
  console.log(`${String(g.fit_score).padStart(3)} | ${String(g.status).padEnd(18)} | ${String(g.source).padEnd(15)} | ${g.title.slice(0, 90)}`);
}
