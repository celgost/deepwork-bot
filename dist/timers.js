import cron from "node-cron";
import { BLOCKS, CHANNELS, ROLES, TIMEZONE } from "./config.js";
import { markExecuted, shouldRun } from "./state.js";
function parseHHMM(hhmm) {
    const [hourStr, minuteStr] = hhmm.split(":");
    return { hour: Number(hourStr), minute: Number(minuteStr) };
}
function addMinutes(hour, minute, minutesToAdd) {
    const total = hour * 60 + minute + minutesToAdd;
    const wrapped = ((total % 1440) + 1440) % 1440;
    return { hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
}
function cronAtTime(hhmm, offsetMinutes) {
    const { hour, minute } = parseHHMM(hhmm);
    const adjusted = addMinutes(hour, minute, offsetMinutes);
    return `${adjusted.minute} ${adjusted.hour} * * *`;
}
export async function sendTimerMarkers(client, guildId, block, marker, options) {
    const jobKey = `timer:${block}:${marker}`;
    if (!options?.force && !shouldRun(jobKey))
        return;
    const guild = await client.guilds.fetch(guildId);
    if (marker === 50) {
        let dw50Channel = null;
        try {
            dw50Channel = await guild.channels.fetch(CHANNELS.deepWork50Voice);
        }
        catch (err) {
            console.error("[timers] fetch DW50 channel failed", {
                guildId,
                channelId: CHANNELS.deepWork50Voice,
                error: err instanceof Error ? err.message : String(err),
            });
        }
        if (dw50Channel && dw50Channel.isTextBased()) {
            await dw50Channel.send(`⏸ Deep Work 50 break (10 minutes) <@&${ROLES.deepWork50}>`);
        }
        else {
            console.error("[timers] DW50 channel not text-based or missing", {
                guildId,
                channelId: CHANNELS.deepWork50Voice,
                exists: Boolean(dw50Channel),
                type: dw50Channel?.type,
            });
        }
    }
    if (marker === 60) {
        let dw50Channel = null;
        try {
            dw50Channel = await guild.channels.fetch(CHANNELS.deepWork50Voice);
        }
        catch (err) {
            console.error("[timers] fetch DW50 channel failed", {
                guildId,
                channelId: CHANNELS.deepWork50Voice,
                error: err instanceof Error ? err.message : String(err),
            });
        }
        if (dw50Channel && dw50Channel.isTextBased()) {
            await dw50Channel.send(`▶ Deep Work 50 second sprint <@&${ROLES.deepWork50}>`);
        }
        else {
            console.error("[timers] DW50 channel not text-based or missing", {
                guildId,
                channelId: CHANNELS.deepWork50Voice,
                exists: Boolean(dw50Channel),
                type: dw50Channel?.type,
            });
        }
    }
    if (marker === 100) {
        let dw100Channel = null;
        try {
            dw100Channel = await guild.channels.fetch(CHANNELS.deepWork100Voice);
        }
        catch (err) {
            console.error("[timers] fetch DW100 channel failed", {
                guildId,
                channelId: CHANNELS.deepWork100Voice,
                error: err instanceof Error ? err.message : String(err),
            });
        }
        if (dw100Channel && dw100Channel.isTextBased()) {
            await dw100Channel.send(`⏸ Deep Work 100 break (20 minutes) <@&${ROLES.deepWork100}>`);
        }
        else {
            console.error("[timers] DW100 channel not text-based or missing", {
                guildId,
                channelId: CHANNELS.deepWork100Voice,
                exists: Boolean(dw100Channel),
                type: dw100Channel?.type,
            });
        }
    }
    if (!options?.force) {
        markExecuted(jobKey);
    }
}
export function scheduleTimerMarkers(client, guildId) {
    const entries = Object.entries(BLOCKS);
    for (const [key, block] of entries) {
        const offsets = [50, 60, 100];
        for (const offset of offsets) {
            const cronExpr = cronAtTime(block.start, offset);
            cron.schedule(cronExpr, () => {
                sendTimerMarkers(client, guildId, key, offset).catch((err) => {
                    console.error(`Timer ${offset} failed:`, err);
                });
            }, { timezone: TIMEZONE });
        }
    }
}
