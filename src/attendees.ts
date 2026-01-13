import type { Client, Guild, TextChannel } from "discord.js";
import { ChannelType } from "discord.js";
import { CHANNELS, EMOJIS, type ModeKey } from "./config.js";
import { buildDailyMessage } from "./message.js";
import { lockedBlocks, signupState } from "./signup.js";

type AttendeeMap = Record<string, string[]>;

function getEmojiFor(block: "A" | "B" | "C" | "D", mode: ModeKey): string {
  if (block === "D" && mode === "DW50") return EMOJIS.D_DW50;
  if (block === "D" && mode === "DW100") return EMOJIS.D_DW100;
  if (block === "A" && mode === "DW50") return EMOJIS.A_DW50;
  if (block === "A" && mode === "DW100") return EMOJIS.A_DW100;
  if (block === "B" && mode === "DW50") return EMOJIS.B_DW50;
  if (block === "B" && mode === "DW100") return EMOJIS.B_DW100;
  if (block === "C" && mode === "DW50") return EMOJIS.C_DW50;
  return EMOJIS.C_DW100;
}

async function formatMemberName(guild: Guild, userId: string): Promise<string> {
  const member = await guild.members.fetch(userId);
  return `<@${member.id}>`;
}

export async function buildAttendeeMap(guild: Guild): Promise<AttendeeMap> {
  const attendees: AttendeeMap = {
    [EMOJIS.D_DW50]: [],
    [EMOJIS.D_DW100]: [],
    [EMOJIS.A_DW50]: [],
    [EMOJIS.A_DW100]: [],
    [EMOJIS.B_DW50]: [],
    [EMOJIS.B_DW100]: [],
    [EMOJIS.C_DW50]: [],
    [EMOJIS.C_DW100]: [],
  };

  const blocks: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
  for (const block of blocks) {
    for (const [userId, mode] of signupState[block]) {
      const name = await formatMemberName(guild, userId);
      const emoji = getEmojiFor(block, mode);
      attendees[emoji].push(name);
    }
  }

  return attendees;
}

export async function updateDailyMessage(
  client: Client,
  guildId: string
): Promise<void> {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
  if (!channel || channel.type !== ChannelType.GuildText) return;

  const textChannel = channel as TextChannel;
  const pins = await textChannel.messages.fetchPins();
  const daily = pins.items.find(
    (pin) =>
      pin.message.author.id === client.user?.id &&
      pin.message.content.includes("**Deep Work Today**")
  );
  if (!daily) return;

  const attendees = await buildAttendeeMap(guild);
  const content = buildDailyMessage(undefined, attendees, lockedBlocks);
  await daily.message.edit(content);
}
