import type { BlockKey, ModeKey } from "./config.js";
import { DateTime } from "luxon";
import { TIMEZONE } from "./config.js";

export type SignupState = Record<BlockKey, Map<string, ModeKey>>;

export type PersistedState = {
  date: string;
  signups: Record<BlockKey, Record<string, ModeKey>>;
  locked: BlockKey[];
};

export const signupState: SignupState = {
  A: new Map(),
  B: new Map(),
  C: new Map(),
};

export const lockedBlocks = new Set<BlockKey>();

let persistHook: (() => void) | null = null;

export function setPersistHook(hook: () => void): void {
  persistHook = hook;
}

export function setSignup(
  block: BlockKey,
  userId: string,
  mode: ModeKey
): void {
  signupState[block].set(userId, mode);
  persistHook?.();
}

export function clearSignup(block: BlockKey, userId: string): void {
  signupState[block].delete(userId);
  persistHook?.();
}

export function replaceBlockSignups(
  block: BlockKey,
  entries: Array<[string, ModeKey]>
): void {
  signupState[block].clear();
  for (const [userId, mode] of entries) {
    signupState[block].set(userId, mode);
  }
  persistHook?.();
}

export function lockBlock(block: BlockKey): void {
  lockedBlocks.add(block);
  persistHook?.();
}

export function isBlockLocked(block: BlockKey): boolean {
  return lockedBlocks.has(block);
}

export function resetSignupState(): void {
  signupState.A.clear();
  signupState.B.clear();
  signupState.C.clear();
  lockedBlocks.clear();
  persistHook?.();
}

function todayKey(): string {
  return DateTime.utc().setZone(TIMEZONE).toFormat("yyyy-LL-dd");
}

export function getSnapshot(): PersistedState {
  const signups: PersistedState["signups"] = {
    A: Object.fromEntries(signupState.A),
    B: Object.fromEntries(signupState.B),
    C: Object.fromEntries(signupState.C),
  };

  return {
    date: todayKey(),
    signups,
    locked: Array.from(lockedBlocks),
  };
}

export function applySnapshot(snapshot: PersistedState): void {
  signupState.A.clear();
  signupState.B.clear();
  signupState.C.clear();
  for (const [userId, mode] of Object.entries(snapshot.signups.A)) {
    signupState.A.set(userId, mode);
  }
  for (const [userId, mode] of Object.entries(snapshot.signups.B)) {
    signupState.B.set(userId, mode);
  }
  for (const [userId, mode] of Object.entries(snapshot.signups.C)) {
    signupState.C.set(userId, mode);
  }
  lockedBlocks.clear();
  for (const block of snapshot.locked) {
    lockedBlocks.add(block);
  }
}
