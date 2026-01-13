import test from "node:test";
import assert from "node:assert/strict";
import {
  applySnapshot,
  clearSignup,
  getSnapshot,
  isBlockLocked,
  lockBlock,
  replaceBlockSignups,
  resetSignupState,
  setPersistHook,
  setSignup,
  signupState,
} from "../src/signup.js";

test("signup state tracks users, locks, and persistence hooks", () => {
  resetSignupState();

  let persisted = 0;
  setPersistHook(() => {
    persisted += 1;
  });

  setSignup("A", "u1", "DW50");
  setSignup("A", "u2", "DW100");
  setSignup("B", "u3", "DW50");
  clearSignup("A", "u2");

  assert.equal(signupState.A.get("u1"), "DW50");
  assert.equal(signupState.A.has("u2"), false);
  assert.equal(signupState.B.get("u3"), "DW50");

  replaceBlockSignups("C", [
    ["u4", "DW100"],
    ["u5", "DW50"],
  ]);
  assert.equal(signupState.C.size, 2);
  assert.equal(signupState.C.get("u4"), "DW100");

  lockBlock("B");
  assert.equal(isBlockLocked("B"), true);

  const snapshot = getSnapshot();
  assert.match(snapshot.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(snapshot.signups.A, { u1: "DW50" });
  assert.deepEqual(snapshot.signups.B, { u3: "DW50" });
  assert.deepEqual(snapshot.signups.C, { u4: "DW100", u5: "DW50" });
  assert.ok(snapshot.locked.includes("B"));

  resetSignupState();
  assert.equal(signupState.A.size, 0);
  applySnapshot(snapshot);
  assert.equal(signupState.A.get("u1"), "DW50");
  assert.equal(isBlockLocked("B"), true);

  assert.ok(persisted >= 5, "persist hook should be called on mutations");
});
