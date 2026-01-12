import cron from "node-cron";
import { ChannelType, Client, TextChannel } from "discord.js";
import { BLOCKS, CHANNELS, ROLES, TIMEZONE, type BlockKey } from "./config.js";
import { markExecuted, shouldRun } from "./state.js";

function parseHHMM(hhmm: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = hhmm.split(":");
  return { hour: Number(hourStr), minute: Number(minuteStr) };
}

function cronForStart(start: string): string {
  const { hour, minute } = parseHHMM(start);
  return `${minute} ${hour} * * *`;
}

export async function sendBlockStartMessages(
  client: Client,
  guildId: string,
  block: BlockKey,
  options?: { force?: boolean }
): Promise<void> {
  const jobKey = `start:${block}`;
  if (!options?.force && !shouldRun(jobKey)) return;

  const guild = await client.guilds.fetch(guildId);

  const textChannel = await guild.channels.fetch(CHANNELS.deepWorkText);
  if (textChannel && textChannel.type === ChannelType.GuildText) {
    await (textChannel as TextChannel).send(
      `🧠 Block ${block} started\n\n` +
        "Deep Work 50: 50 → 10 → 50  \n" +
        "Deep Work 100: 100 → 20"
    );
  }

  const dw50Channel = await guild.channels.fetch(CHANNELS.deepWork50Voice);
  if (dw50Channel && dw50Channel.isTextBased()) {
    await (dw50Channel as TextChannel).send(
      `<@&${ROLES.deepWork50}>\n` +
        "What is your todolist for this session?\n" +
        "Write it here concisely."
    );
  }

  const dw100Channel = await guild.channels.fetch(CHANNELS.deepWork100Voice);
  if (dw100Channel && dw100Channel.isTextBased()) {
    await (dw100Channel as TextChannel).send(
      `<@&${ROLES.deepWork100}>\n` +
        "What is your todolist for this session?\n" +
        "Write it here concisely."
    );
  }

  if (!options?.force) {
    markExecuted(jobKey);
  }
}

export function scheduleBlockStarts(client: Client, guildId: string): void {
  const entries = Object.entries(BLOCKS) as Array<
    [BlockKey, { start: string }]
  >;

  for (const [key, block] of entries) {
    const cronExpr = cronForStart(block.start);
    cron.schedule(
      cronExpr,
      () => {
        sendBlockStartMessages(client, guildId, key).catch((err) => {
          console.error(`Block ${key} start failed:`, err);
        });
      },
      { timezone: TIMEZONE }
    );
  }
}
