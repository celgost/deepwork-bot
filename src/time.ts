import { DateTime } from "luxon";
import { BLOCKS, TIMEZONE } from "./config.js";

export type BlockTimes = {
  startTs: number;
  lockTs: number;
  endTs: number;
};

export type DailyBlockTimestamps = Record<keyof typeof BLOCKS, BlockTimes>;

const [ZERO_TIME_HOUR, ZERO_TIME_MINUTE] = [0, 0];

function parseHHMM(hhmm: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = hhmm.split(":");
  return { hour: Number(hourStr), minute: Number(minuteStr) };
}

function baseDayCET(date?: Date): DateTime {
  const base = date ? DateTime.fromJSDate(date) : DateTime.utc();
  return base.setZone(TIMEZONE).set({
    hour: ZERO_TIME_HOUR,
    minute: ZERO_TIME_MINUTE,
    second: 0,
    millisecond: 0,
  });
}

export function getDailyBlockTimestamps(date?: Date): DailyBlockTimestamps {
  const day = baseDayCET(date);

  const entries = (Object.keys(BLOCKS) as Array<keyof typeof BLOCKS>).map(
    (blockKey) => {
      const block = BLOCKS[blockKey];
      const startParts = parseHHMM(block.start);
      const endParts = parseHHMM(block.end);

      const start = day.set({
        hour: startParts.hour,
        minute: startParts.minute,
      });

      const endBase = day.set({
        hour: endParts.hour,
        minute: endParts.minute,
      });

      const end =
        endParts.hour < startParts.hour ||
        (endParts.hour === startParts.hour &&
          endParts.minute < startParts.minute)
          ? endBase.plus({ days: 1 })
          : endBase;

      const lock = start.minus({ minutes: block.lockMinutesBefore });

      return [
        blockKey,
        {
          startTs: Math.floor(start.toSeconds()),
          lockTs: Math.floor(lock.toSeconds()),
          endTs: Math.floor(end.toSeconds()),
        },
      ] as const;
    }
  );

  return Object.fromEntries(entries) as DailyBlockTimestamps;
}
