import { promises as fs } from "fs";
import path from "path";
import { DateTime } from "luxon";
import { TIMEZONE } from "./config.js";
import { applySnapshot, getSnapshot, resetSignupState, setPersistHook, } from "./signup.js";
const DATA_DIR = path.resolve(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
let executionMap = {};
let dailyMessageId = null;
function todayKey() {
    return DateTime.utc().setZone(TIMEZONE).toFormat("yyyy-LL-dd");
}
export async function persistState() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const snapshot = getSnapshot();
    const stored = {
        ...snapshot,
        executions: executionMap,
        dailyMessageId: dailyMessageId ?? undefined,
    };
    await fs.writeFile(STATE_FILE, JSON.stringify(stored, null, 2), "utf8");
}
export async function loadState() {
    try {
        const raw = await fs.readFile(STATE_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.date)
            return;
        if (parsed.date !== todayKey()) {
            resetSignupState();
            executionMap = {};
            await persistState();
            return;
        }
        applySnapshot(parsed);
        executionMap = parsed.executions ?? {};
        dailyMessageId = parsed.dailyMessageId ?? null;
    }
    catch (err) {
        if (err.code === "ENOENT")
            return;
        console.error("Failed to load state:", err);
    }
}
export async function resetPersistedState() {
    resetSignupState();
    executionMap = {};
    dailyMessageId = null;
    await persistState();
}
export function emptyPersistedState() {
    const emptyBlock = {};
    return {
        date: todayKey(),
        signups: { A: { ...emptyBlock }, B: { ...emptyBlock }, C: { ...emptyBlock } },
        locked: [],
    };
}
export function shouldRun(jobKey) {
    return executionMap[jobKey] !== todayKey();
}
export function markExecuted(jobKey) {
    executionMap[jobKey] = todayKey();
    void persistState();
}
export function setDailyMessageId(messageId) {
    dailyMessageId = messageId;
    void persistState();
}
export function getDailyMessageId() {
    return dailyMessageId;
}
export async function initStatePersistence() {
    setPersistHook(() => {
        void persistState();
    });
    await loadState();
}
