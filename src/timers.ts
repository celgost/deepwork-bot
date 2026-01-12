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

  if (marker === 50) {
    const dw50Channel = await guild.channels.fetch(CHANNELS.deepWork50Voice);
    if (dw50Channel && dw50Channel.isTextBased()) {
      await (dw50Channel as TextChannel).send(
        `⏸ Deep Work 50 break (10 minutes) <@&${ROLES.deepWork50}>`
      );
    }
  }

  if (marker === 60) {
    const dw50Channel = await guild.channels.fetch(CHANNELS.deepWork50Voice);
    if (dw50Channel && dw50Channel.isTextBased()) {
      await (dw50Channel as TextChannel).send(
        `▶ Deep Work 50 second sprint <@&${ROLES.deepWork50}>`
      );
    }
  }

  if (marker === 100) {
    const dw100Channel = await guild.channels.fetch(CHANNELS.deepWork100Voice);
    if (dw100Channel && dw100Channel.isTextBased()) {
      await (dw100Channel as TextChannel).send(
        `⏸ Deep Work 100 break (20 minutes) <@&${ROLES.deepWork100}>`
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
