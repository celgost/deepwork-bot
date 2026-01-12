import cron from "node-cron";
import { ChannelType, Client, TextChannel } from "discord.js";
import {
  BLOCKS,
  CHANNELS,
  ID_REGEX,
  ROLES,
  TIMEZONE,
  type BlockKey,
} from "./config.js";
import { signupState } from "./signup.js";
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

export async function endBlockNow(
  client: Client,
  guildId: string,
  block: BlockKey,
  options?: { suppressMessage?: boolean; force?: boolean }
): Promise<void> {
  const jobKey = `end:${block}`;
  if (!options?.force && !shouldRun(jobKey)) return;

  const guild = await client.guilds.fetch(guildId);
  const role50 = ID_REGEX.test(ROLES.deepWork50)
    ? await guild.roles.fetch(ROLES.deepWork50)
    : null;
  const role100 = ID_REGEX.test(ROLES.deepWork100)
    ? await guild.roles.fetch(ROLES.deepWork100)
    : null;

  const entries = signupState[block];
  for (const [userId, mode] of entries) {
    const member = await guild.members.fetch(userId);
    if (mode === "DW50" && role50) {
      if (member.roles.cache.has(role50.id)) {
        await member.roles.remove(role50);
      }
    }
    if (mode === "DW100" && role100) {
      if (member.roles.cache.has(role100.id)) {
        await member.roles.remove(role100);
      }
    }
  }

  if (!options?.suppressMessage) {
    const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
    if (channel && channel.type === ChannelType.GuildText) {
      await (channel as TextChannel).send(
        "Block ended.\nDid you do what you planned?\nyes / partial / no"
      );
    }
  }

  entries.clear();
  if (!options?.force) {
    markExecuted(jobKey);
  }
}

export function scheduleBlockEnds(client: Client, guildId: string): void {
  const entries = Object.entries(BLOCKS) as Array<
    [BlockKey, { start: string }]
  >;

  for (const [key, block] of entries) {
    const cronExpr = cronAtTime(block.start, 120);
    cron.schedule(
      cronExpr,
      () => {
        endBlockNow(client, guildId, key).catch((err) => {
          console.error(`Block ${key} end failed:`, err);
        });
      },
      { timezone: TIMEZONE }
    );
  }
}
