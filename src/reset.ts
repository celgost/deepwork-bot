import { ChannelType, Client, Message, TextChannel } from "discord.js";
import { CHANNELS, EMOJIS, ID_REGEX, ROLES } from "./config.js";
import { buildDailyMessage } from "./message.js";
import {
  markExecuted,
  resetPersistedState,
  setDailyMessageId,
  shouldRun,
} from "./state.js";

const PIN_MARKER = "**Deep Work Today**";

async function unpinExistingDailyMessage(channel: TextChannel): Promise<void> {
  const pins = await channel.messages.fetchPins();
  const toUnpin = pins.items.filter(
    (pin) =>
      pin.message.author.id === channel.client.user?.id &&
      pin.message.content.includes(PIN_MARKER)
  );

  for (const pin of toUnpin) {
    await pin.message.unpin();
  }
}

async function addDailyReactions(message: Message): Promise<void> {
  const reactionOrder = [
    EMOJIS.A_DW50,
    EMOJIS.A_DW100,
    EMOJIS.B_DW50,
    EMOJIS.B_DW100,
    EMOJIS.C_DW50,
    EMOJIS.C_DW100,
    EMOJIS.D_DW50,
    EMOJIS.D_DW100,
  ];

  for (const emoji of reactionOrder) {
    const existing = message.reactions.cache.get(emoji);
    if (!existing) {
      await message.react(emoji);
    }
  }
}

async function clearDeepWorkRoles(
  client: Client,
  guildId: string
): Promise<void> {
  const guild = await client.guilds.fetch(guildId);
  const role50 = ID_REGEX.test(ROLES.deepWork50)
    ? await guild.roles.fetch(ROLES.deepWork50)
    : null;
  const role100 = ID_REGEX.test(ROLES.deepWork100)
    ? await guild.roles.fetch(ROLES.deepWork100)
    : null;

  if (role50) {
    const members = role50.members;
    for (const member of members.values()) {
      await member.roles.remove(role50);
    }
  }

  if (role100) {
    const members = role100.members;
    for (const member of members.values()) {
      await member.roles.remove(role100);
    }
  }
}

export async function resetDaily(client: Client, guildId: string): Promise<void> {
  if (!shouldRun("daily-reset")) return;
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(CHANNELS.deepWorkText);

  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error("Deep work text channel not found or not a text channel.");
  }

  const textChannel = channel as TextChannel;

  await unpinExistingDailyMessage(textChannel);

  await resetPersistedState();
  const message = await textChannel.send(buildDailyMessage());
  await message.pin();
  await addDailyReactions(message);
  setDailyMessageId(message.id);

  await clearDeepWorkRoles(client, guildId);
  markExecuted("daily-reset");
}
