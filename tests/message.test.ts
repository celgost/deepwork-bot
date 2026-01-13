import test from "node:test";
import assert from "node:assert/strict";
import { EMOJIS } from "../src/config.js";
import { buildDailyMessage } from "../src/message.js";

test("buildDailyMessage includes attendees and lock state", () => {
  const attendees = {
    [EMOJIS.A_DW50]: ["Brice (celgost)", "Alex (alex)"] as string[],
    [EMOJIS.C_DW100]: ["Mei (mei)"] as string[],
  };
  const locked = new Set(["B"] as const);

  const message = buildDailyMessage(
    new Date("2024-01-15T12:00:00Z"),
    attendees,
    locked
  );

  assert.ok(message.includes("**Deep Work Today**"));
  assert.ok(message.includes(`${EMOJIS.A_DW50} Deep Work 50`));
  assert.ok(message.includes("Brice (celgost), Alex (alex)"));
  assert.ok(message.includes(`${EMOJIS.C_DW100} Deep Work 100`));
  assert.ok(message.includes("Mei (mei)"));

  assert.ok(message.includes("**B**"));
  assert.ok(message.includes("**D**"));
  assert.ok(message.includes("🔒 Locked"));
  assert.ok(message.includes("🔒 Locks <t:"));
  assert.ok(message.includes("No one yet"));
});
