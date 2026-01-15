import { DateTime } from "luxon";
import type { Client } from "discord.js";
import { BLOCKS, TIMEZONE, type BlockKey } from "./config.js";
import { getDailyBlockTimestamps } from "./time.js";
import { lockBlockNow } from "./lock.js";
import { endBlockNow } from "./blockEnd.js";

export async function runStartupRecovery(
  client: Client,
  guildId: string
): Promise<void> {
  const now = DateTime.utc().setZone(TIMEZONE).toSeconds();
  const times = getDailyBlockTimestamps();
  const entries = Object.keys(BLOCKS) as BlockKey[];

  for (const block of entries) {
    const { lockTs, startTs, endTs } = times[block];

    if (now >= lockTs && now < endTs) {
      await lockBlockNow(client, guildId, block);
    }

    if (now >= endTs) {
      await endBlockNow(client, guildId, block);
    }
  }
}
