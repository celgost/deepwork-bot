import { DateTime } from "luxon";
import { TIMEZONE } from "./config.js";
export const signupState = {
    A: new Map(),
    B: new Map(),
    C: new Map(),
};
export const lockedBlocks = new Set();
let persistHook = null;
export function setPersistHook(hook) {
    persistHook = hook;
}
export function setSignup(block, userId, mode) {
    signupState[block].set(userId, mode);
    persistHook?.();
}
export function clearSignup(block, userId) {
    signupState[block].delete(userId);
    persistHook?.();
}
export function replaceBlockSignups(block, entries) {
    signupState[block].clear();
    for (const [userId, mode] of entries) {
        signupState[block].set(userId, mode);
    }
    persistHook?.();
}
export function lockBlock(block) {
    lockedBlocks.add(block);
    persistHook?.();
}
export function isBlockLocked(block) {
    return lockedBlocks.has(block);
}
export function resetSignupState() {
    signupState.A.clear();
    signupState.B.clear();
    signupState.C.clear();
    lockedBlocks.clear();
    persistHook?.();
}
function todayKey() {
    return DateTime.utc().setZone(TIMEZONE).toFormat("yyyy-LL-dd");
}
export function getSnapshot() {
    const signups = {
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
export function applySnapshot(snapshot) {
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
