import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliJs = join(root, "dist", "cli.js");

describe("CLI bin", () => {
  it("prints version and help from dist/cli.js", () => {
    assert.ok(existsSync(cliJs), "run npm run build first");
    const ver = spawnSync(process.execPath, [cliJs, "version"], {
      encoding: "utf8",
      cwd: root,
    });
    assert.equal(ver.status, 0, ver.stderr);
    assert.match(ver.stdout, /\d+\.\d+\.\d+/);

    const help = spawnSync(process.execPath, [cliJs, "help"], {
      encoding: "utf8",
      cwd: root,
    });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /init/i);
    assert.match(help.stdout, /doctor/i);
    assert.match(help.stdout, /uninstall/i);
  });
});
