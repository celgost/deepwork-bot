import { DateTime } from "luxon";
import { BLOCKS, TIMEZONE } from "./config.js";
import { getDailyBlockTimestamps } from "./time.js";
import { lockBlockNow } from "./lock.js";
import { endBlockNow } from "./blockEnd.js";
export async function runStartupRecovery(client, guildId) {
    const now = DateTime.utc().setZone(TIMEZONE).toSeconds();
    const times = getDailyBlockTimestamps();
    const entries = Object.keys(BLOCKS);
    for (const block of entries) {
        const { lockTs, startTs, endTs } = times[block];
        if (now >= lockTs && now < endTs) {
            await lockBlockNow(client, guildId, block);
        }
        if (now >= endTs) {
            await endBlockNow(client, guildId, block, { suppressMessage: true });
        }
    }
}
