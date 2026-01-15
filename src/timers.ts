import cron from "node-cron";
import { ChannelType, Client, TextChannel } from "discord.js";
import { BLOCKS, CHANNELS, ROLES, TIMEZONE, type BlockKey } from "./config.js";
import { markExecuted, shouldRun } from "./state.js";

function parseHHMM(hhmm: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = hhmm.split(":");
  return { hour: Number(hourStr), minute: Number(minuteStr) };
}

function addMinutes(
  hour: number,
  minute: number,
  minutesToAdd: number
): { hour: number; minute: number } {
  const total = hour * 60 + minute + minutesToAdd;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return { hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
}

function cronAtTime(hhmm: string, offsetMinutes: number): string {
  const { hour, minute } = parseHHMM(hhmm);
  const adjusted = addMinutes(hour, minute, offsetMinutes);
  return `${adjusted.minute} ${adjusted.hour} * * *`;
}

export async function sendTimerMarkers(
  client: Client,
  guildId: string,
  block: BlockKey,
  marker: 50 | 60 | 100,
  options?: { force?: boolean }
): Promise<void> {
  const jobKey = `timer:${block}:${marker}`;
  if (!options?.force && !shouldRun(jobKey)) return;

  const guild = await client.guilds.fetch(guildId);

  const dwChannel = await guild.channels.fetch(CHANNELS.deepWork50Voice);
  if (dwChannel && dwChannel.isTextBased()) {
    if (marker === 50) {
      await (dwChannel as TextChannel).send(
        `⏸ Deep Work timer paused (10 minutes break) <@&${ROLES.deepWork50}>`
      );
    }

    if (marker === 60) {
      await (dwChannel as TextChannel).send(
        `▶ Deep Work 50 minutes sprint <@&${ROLES.deepWork50}>`
      );
    }

    if (marker === 100) {
      await (dwChannel as TextChannel).send(
        `⏸ Deep Work timer paused (20 minutes break) <@&${ROLES.deepWork100}>`
      );
      await (dwChannel as TextChannel).send(
        `⏸ Deep Work timer paused (10 minutes break) <@&${ROLES.deepWork50}>`
      );
    }
  }

  if (!options?.force) {
    markExecuted(jobKey);
  }
}

export function scheduleTimerMarkers(client: Client, guildId: string): void {
  const entries = Object.entries(BLOCKS) as Array<
    [BlockKey, { start: string }]
  >;

  for (const [key, block] of entries) {
    const offsets: Array<50 | 60 | 100> = [50, 60, 100];
    for (const offset of offsets) {
      const cronExpr = cronAtTime(block.start, offset);
      cron.schedule(
        cronExpr,
        () => {
          sendTimerMarkers(client, guildId, key, offset).catch((err) => {
            console.error(`Timer ${offset} failed:`, err);
          });
        },
        { timezone: TIMEZONE }
      );
    }
  }
}
