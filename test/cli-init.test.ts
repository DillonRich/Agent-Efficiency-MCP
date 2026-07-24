import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliJs = join(root, "dist", "cli.js");

describe("CLI init / uninstall / doctor", () => {
  it("init wires rules+blueprint+mcp, doctor sees rules, uninstall cleans", () => {
    assert.ok(existsSync(cliJs), "run npm run build first");
    const project = mkdtempSync(join(tmpdir(), "aee-cliinit-"));
    try {
      mkdirSync(join(project, ".cursor"), { recursive: true });
      writeFileSync(join(project, "AGENTS.md"), "# Demo\n");
      writeFileSync(join(project, "package.json"), '{"name":"cli-demo"}\n');

      const init = spawnSync(
        process.execPath,
        [
          cliJs,
          "init",
          "--project",
          project,
          "--skip-hosts", // avoid writing global IDE configs in CI
          "--launch",
          "node",
        ],
        { encoding: "utf8", cwd: root, env: { ...process.env } },
      );
      assert.equal(init.status, 0, init.stderr + init.stdout);
      assert.ok(
        existsSync(join(project, ".cursor", "rules", "00-promptmcp.mdc")),
      );
      assert.ok(existsSync(join(project, "Agent_Efficiency_MCP.md")));
      assert.match(
        readFileSync(join(project, "AGENTS.md"), "utf8"),
        /PRIORITY 0|optimize_and_blueprint_intent/,
      );

      // Host MCP merge is covered in contract tests (temp project only).
      // Avoid CLI init without --skip-hosts here — it can rewrite the developer’s global IDE configs.

      const doctor = spawnSync(
        process.execPath,
        [cliJs, "doctor", "--project", project],
        {
          encoding: "utf8",
          cwd: root,
          env: {
            ...process.env,
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "test-not-real",
          },
        },
      );
      assert.match(doctor.stdout, /PRIORITY 0/i);

      const uninstallKeepBlueprint = spawnSync(
        process.execPath,
        [cliJs, "uninstall", "--project", project],
        { encoding: "utf8", cwd: root },
      );
      assert.equal(
        uninstallKeepBlueprint.status,
        0,
        uninstallKeepBlueprint.stderr,
      );
      assert.ok(
        !existsSync(join(project, ".cursor", "rules", "00-promptmcp.mdc")),
      );
      // blueprint kept without --purge
      assert.ok(existsSync(join(project, "Agent_Efficiency_MCP.md")));

      // re-init then purge
      const init2 = spawnSync(
        process.execPath,
        [
          cliJs,
          "init",
          "--project",
          project,
          "--skip-hosts",
          "--launch",
          "node",
        ],
        { encoding: "utf8", cwd: root, env: { ...process.env } },
      );
      assert.equal(init2.status, 0, init2.stderr + init2.stdout);
      mkdirSync(join(project, ".promptmcp", "hosts"), { recursive: true });
      writeFileSync(join(project, ".promptmcp", "hosts", "tip.md"), "x\n");

      const uninstallPurge = spawnSync(
        process.execPath,
        [cliJs, "uninstall", "--project", project, "--purge"],
        { encoding: "utf8", cwd: root },
      );
      assert.equal(uninstallPurge.status, 0, uninstallPurge.stderr);
      assert.ok(!existsSync(join(project, "Agent_Efficiency_MCP.md")));
      assert.ok(!existsSync(join(project, ".promptmcp", "hosts")));
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
