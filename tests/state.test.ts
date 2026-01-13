import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function loadStateModule(tmpDir: string) {
  const previous = process.cwd();
  process.chdir(tmpDir);
  const fileUrl = new URL("../src/state.ts", import.meta.url).toString();
  const module = await import(`${fileUrl}?t=${Date.now()}`);
  return { module, previous };
}

test("state persistence writes and restores data", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "deepwork-state-"));
  const { module, previous } = await loadStateModule(tmpDir);
  const {
    markExecuted,
    setDailyMessageId,
    getDailyMessageId,
    persistState,
    loadState,
    shouldRun,
  } = module;

  markExecuted("job:lock:A");
  setDailyMessageId("123");
  await persistState();

  const stateFile = path.join(tmpDir, "data", "state.json");
  const raw = await readFile(stateFile, "utf8");
  const parsed = JSON.parse(raw) as { dailyMessageId?: string };
  assert.equal(parsed.dailyMessageId, "123");

  const { module: moduleReloaded } = await loadStateModule(tmpDir);
  await moduleReloaded.loadState();
  assert.equal(moduleReloaded.getDailyMessageId(), "123");
  assert.equal(moduleReloaded.shouldRun("job:lock:A"), false);

  process.chdir(previous);

  assert.equal(getDailyMessageId(), "123");
  assert.equal(shouldRun("job:lock:A"), false);
});
