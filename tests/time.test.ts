import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { TIMEZONE } from "../src/config.js";
import { getDailyBlockTimestamps } from "../src/time.js";

test("getDailyBlockTimestamps computes CET block times and lock", () => {
  const reference = new Date("2024-01-15T12:00:00Z");
  const times = getDailyBlockTimestamps(reference);

  const startA = DateTime.fromObject(
    { year: 2024, month: 1, day: 15, hour: 10, minute: 0 },
    { zone: TIMEZONE }
  );
  const endA = DateTime.fromObject(
    { year: 2024, month: 1, day: 15, hour: 12, minute: 0 },
    { zone: TIMEZONE }
  );
  const lockA = startA.minus({ minutes: 5 });

  assert.equal(times.A.startTs, Math.floor(startA.toSeconds()));
  assert.equal(times.A.endTs, Math.floor(endA.toSeconds()));
  assert.equal(times.A.lockTs, Math.floor(lockA.toSeconds()));

  const startD = DateTime.fromObject(
    { year: 2024, month: 1, day: 15, hour: 22, minute: 0 },
    { zone: TIMEZONE }
  );
  const endD = DateTime.fromObject(
    { year: 2024, month: 1, day: 16, hour: 0, minute: 0 },
    { zone: TIMEZONE }
  );
  const lockD = startD.minus({ minutes: 5 });

  assert.equal(times.D.startTs, Math.floor(startD.toSeconds()));
  assert.equal(times.D.endTs, Math.floor(endD.toSeconds()));
  assert.equal(times.D.lockTs, Math.floor(lockD.toSeconds()));
  assert.ok(times.D.endTs > times.D.startTs, "D block crosses midnight");
});
