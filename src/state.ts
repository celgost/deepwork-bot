import { promises as fs } from "fs";
import path from "path";
import { DateTime } from "luxon";
import { TIMEZONE, type BlockKey } from "./config.js";
import {
  applySnapshot,
  getSnapshot,
  resetSignupState,
  setPersistHook,
  type PersistedState,
} from "./signup.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

type StoredState = PersistedState & {
  executions?: Record<string, string>;
  dailyMessageId?: string;
};

let executionMap: Record<string, string> = {};
let dailyMessageId: string | null = null;

function todayKey(): string {
  return DateTime.utc().setZone(TIMEZONE).toFormat("yyyy-LL-dd");
}

export async function persistState(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const snapshot = getSnapshot();
  const stored: StoredState = {
    ...snapshot,
    executions: executionMap,
    dailyMessageId: dailyMessageId ?? undefined,
  };
  await fs.writeFile(STATE_FILE, JSON.stringify(stored, null, 2), "utf8");
}

export async function loadState(): Promise<void> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed || !parsed.date) return;

    if (parsed.date !== todayKey()) {
      resetSignupState();
      executionMap = {};
      await persistState();
      return;
    }

    applySnapshot(parsed);
    executionMap = parsed.executions ?? {};
    dailyMessageId = parsed.dailyMessageId ?? null;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    console.error("Failed to load state:", err);
  }
}

export async function resetPersistedState(): Promise<void> {
  resetSignupState();
  executionMap = {};
  dailyMessageId = null;
  await persistState();
}

export function emptyPersistedState(): PersistedState {
  const emptyBlock = {} as Record<string, "DW50" | "DW100">;
  return {
    date: todayKey(),
    signups: { A: { ...emptyBlock }, B: { ...emptyBlock }, C: { ...emptyBlock } },
    locked: [] as BlockKey[],
  };
}

export function shouldRun(jobKey: string): boolean {
  return executionMap[jobKey] !== todayKey();
}

export function markExecuted(jobKey: string): void {
  executionMap[jobKey] = todayKey();
  void persistState();
}

export function setDailyMessageId(messageId: string): void {
  dailyMessageId = messageId;
  void persistState();
}

export function getDailyMessageId(): string | null {
  return dailyMessageId;
}

export async function initStatePersistence(): Promise<void> {
  setPersistHook(() => {
    void persistState();
  });
  await loadState();
}
