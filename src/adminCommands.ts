import {
  PermissionsBitField,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { ADMIN_IDS, ADMIN_ROLE_ID, CHANNELS, ID_REGEX } from "./config.js";
import { buildDailyMessage } from "./message.js";
import { setDailyMessageId } from "./state.js";
import { buildTestCommands } from "./testMode.js";

const PIN_MARKER = "**Deep Work Today**";

function isAdminInteraction(interaction: ChatInputCommandInteraction): boolean {
  if (ADMIN_IDS.includes(interaction.user.id)) return true;
  const member = interaction.member;
  if (!member || typeof member !== "object") return false;
  if (ID_REGEX.test(ADMIN_ROLE_ID)) {
    if ("roles" in member) {
      const roles = member.roles;
      if (Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID)) return true;
      if (!Array.isArray(roles) && "cache" in roles && roles.cache.has(ADMIN_ROLE_ID)) return true;
    }
  }
  const perms = "permissions" in member ? member.permissions : undefined;
  if (typeof perms === "string") {
    if (
      new PermissionsBitField(BigInt(perms)).has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return true;
    }
  } else if (
    perms && new PermissionsBitField(perms).has(PermissionsBitField.Flags.ManageGuild)
  ) {
    return true;
  }
  return false;
}

async function unpinExistingDailyForGuild(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const guild = await interaction.client.guilds.fetch(interaction.guildId ?? "");
  const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
  if (!channel || !channel.isTextBased()) return;
  const pins = await channel.messages.fetchPins();
  const toUnpin = pins.items.filter(
    (pin) =>
      pin.message.author.id === interaction.client.user?.id &&
      pin.message.content.includes(PIN_MARKER)
  );
  for (const pin of toUnpin) {
    await pin.message.unpin();
  }
}

async function postDailyForGuild(interaction: ChatInputCommandInteraction): Promise<void> {
  await unpinExistingDailyForGuild(interaction);
  const guild = await interaction.client.guilds.fetch(interaction.guildId ?? "");
  const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
  if (!channel || !channel.isTextBased()) return;
  const daily = await channel.send(buildDailyMessage());
  await daily.pin();
  for (const emoji of ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"] as const) {
    if (!daily.reactions.cache.get(emoji)) {
      await daily.react(emoji);
    }
  }
  setDailyMessageId(daily.id);
}

export function buildAdminCommands(): SlashCommandBuilder[] {
  return [
    new SlashCommandBuilder()
      .setName("post_daily")
      .setDescription("Post and pin today’s Deep Work message"),
  ];
}

export async function registerAllCommands(
  clientId: string,
  guildId: string,
  includeTests: boolean
): Promise<void> {
  const { REST, Routes } = await import("discord.js");
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN ?? "");
  const admin = buildAdminCommands();
  const test = includeTests ? buildTestCommands() : [];
  const commands = [...admin, ...test].map((c) => c.toJSON());
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
}

export async function handleAdminInteraction(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  if (!interaction.guildId) return false;
  if (interaction.commandName !== "post_daily") return false;
  if (!isAdminInteraction(interaction)) {
    await interaction.reply({
      content: "You are not authorized to use this command.",
      ephemeral: true,
    });
    return true;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    await postDailyForGuild(interaction);
    await interaction.editReply("Posted and pinned daily message.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await interaction.editReply(`Command failed: ${message}`);
  }
  return true;
}
