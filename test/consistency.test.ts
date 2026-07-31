import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("product consistency", () => {
  it("keeps AGPL license story consistent in key surfaces", () => {
    const pkg = JSON.parse(read("package.json")) as { license?: string };
    assert.equal(pkg.license, "AGPL-3.0-only");
    assert.match(read("README.md"), /AGPL-3\.0/);
    assert.match(read("AGENTS.md"), /AGPL-3\.0/);
    assert.ok(!/\bMIT\b/.test(read("AGENTS.md")));
    assert.match(read("LICENSE"), /GNU AFFERO GENERAL PUBLIC LICENSE/i);
  });

  it("uses Agent_Efficiency_MCP.md as blueprint name (not legacy .agent_intent)", () => {
    const constants = read("src/constants.ts");
    assert.match(constants, /Agent_Efficiency_MCP\.md/);
    assert.ok(!/\.agent_intent\.md/.test(constants));
    const readme = read("README.md");
    assert.match(readme, /Agent_Efficiency_MCP\.md/);
  });

  it("PRIORITY 0 template enforces zero-token-before-tool", () => {
    const rules = read("templates/00-promptmcp.mdc");
    assert.match(rules, /alwaysApply:\s*true/);
    assert.match(rules, /ZERO.?TOKEN|first action this turn MUST/i);
    assert.match(rules, /optimize_and_blueprint_intent/);
  });

  it("required scripts and CI dogfood exist", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    for (const s of [
      "test",
      "smoke",
      "eval:mock",
      "auto-dogfood",
      "flake-check",
      "doctor",
    ]) {
      assert.ok(pkg.scripts[s], `missing script ${s}`);
    }
    assert.match(read(".github/workflows/ci.yml"), /auto-dogfood/);
    assert.ok(existsSync(join(root, "docs/assets/demo.gif")));
  });
});
