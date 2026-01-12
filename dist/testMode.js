import { ChannelType, PermissionsBitField, SlashCommandBuilder, } from "discord.js";
import { ADMIN_IDS, ADMIN_ROLE_ID, CHANNELS, EMOJIS, ID_REGEX, } from "./config.js";
import { buildDailyMessage } from "./message.js";
import { updateDailyMessage } from "./attendees.js";
import { lockBlockNow } from "./lock.js";
import { sendBlockStartMessages } from "./blockStart.js";
import { sendTimerMarkers } from "./timers.js";
import { endBlockNow } from "./blockEnd.js";
import { resetDaily } from "./reset.js";
import { lockedBlocks, replaceBlockSignups, signupState, } from "./signup.js";
import { getDailyMessageId, setDailyMessageId } from "./state.js";
const PIN_MARKER = "**Deep Work Today**";
async function isAdmin(message) {
    if (ADMIN_IDS.includes(message.author.id))
        return true;
    if (!message.member)
        return false;
    if (!ID_REGEX.test(ADMIN_ROLE_ID))
        return false;
    return message.member.roles.cache.has(ADMIN_ROLE_ID);
}
function isAdminInteraction(interaction) {
    if (ADMIN_IDS.includes(interaction.user.id))
        return true;
    const member = interaction.member;
    if (!member || typeof member !== "object")
        return false;
    if (ID_REGEX.test(ADMIN_ROLE_ID)) {
        if ("roles" in member) {
            const roles = member.roles;
            if (Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID))
                return true;
            if (!Array.isArray(roles) && "cache" in roles && roles.cache.has(ADMIN_ROLE_ID))
                return true;
        }
    }
    const perms = "permissions" in member ? member.permissions : undefined;
    if (typeof perms === "string") {
        if (new PermissionsBitField(BigInt(perms)).has(PermissionsBitField.Flags.ManageGuild)) {
            return true;
        }
    }
    else if (perms && new PermissionsBitField(perms).has(PermissionsBitField.Flags.ManageGuild)) {
        return true;
    }
    return false;
}
async function fetchDailyMessageForGuild(client, guildId) {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
    if (!channel || channel.type !== ChannelType.GuildText)
        return null;
    const pins = await channel.messages.fetchPins();
    const daily = pins.items.find((pin) => pin.message.author.id === client.user?.id &&
        pin.message.content.includes(PIN_MARKER));
    return daily?.message ?? null;
}
async function addDailyReactions(message) {
    const reactionOrder = [
        EMOJIS.A_DW50,
        EMOJIS.A_DW100,
        EMOJIS.B_DW50,
        EMOJIS.B_DW100,
        EMOJIS.C_DW50,
        EMOJIS.C_DW100,
    ];
    for (const emoji of reactionOrder) {
        const existing = message.reactions.cache.get(emoji);
        if (!existing) {
            await message.react(emoji);
        }
    }
}
async function unpinExistingDailyForGuild(client, guildId) {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
    if (!channel || channel.type !== ChannelType.GuildText)
        return;
    const pins = await channel.messages.fetchPins();
    const toUnpin = pins.items.filter((pin) => pin.message.author.id === client.user?.id &&
        pin.message.content.includes(PIN_MARKER));
    for (const pin of toUnpin) {
        await pin.message.unpin();
    }
}
async function postDailyForGuild(client, guildId) {
    await unpinExistingDailyForGuild(client, guildId);
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
    if (!channel || channel.type !== ChannelType.GuildText)
        return;
    const textChannel = channel;
    const daily = await textChannel.send(buildDailyMessage());
    await daily.pin();
    await addDailyReactions(daily);
    setDailyMessageId(daily.id);
}
async function syncFromReactionsForGuild(client, guildId) {
    const daily = await fetchDailyMessageForGuild(client, guildId);
    if (!daily)
        return;
    const full = await daily.fetch();
    const blocks = ["A", "B", "C"];
    for (const block of blocks) {
        const dw50Emoji = block === "A"
            ? EMOJIS.A_DW50
            : block === "B"
                ? EMOJIS.B_DW50
                : EMOJIS.C_DW50;
        const dw100Emoji = block === "A"
            ? EMOJIS.A_DW100
            : block === "B"
                ? EMOJIS.B_DW100
                : EMOJIS.C_DW100;
        const dw50Reaction = full.reactions.cache.get(dw50Emoji);
        const dw100Reaction = full.reactions.cache.get(dw100Emoji);
        const dw50Users = dw50Reaction ? await dw50Reaction.users.fetch() : null;
        const dw100Users = dw100Reaction ? await dw100Reaction.users.fetch() : null;
        const entries = [];
        if (dw50Users) {
            for (const user of dw50Users.values()) {
                if (!user.bot)
                    entries.push([user.id, "DW50"]);
            }
        }
        if (dw100Users) {
            for (const user of dw100Users.values()) {
                if (!user.bot)
                    entries.push([user.id, "DW100"]);
            }
        }
        if (!lockedBlocks.has(block)) {
            replaceBlockSignups(block, entries);
        }
    }
    await updateDailyMessage(client, guildId);
}
function formatState() {
    const blockSummary = (block) => {
        const entries = signupState[block];
        const dw50 = Array.from(entries.values()).filter((m) => m === "DW50").length;
        const dw100 = Array.from(entries.values()).filter((m) => m === "DW100").length;
        return `${block}: DW50=${dw50}, DW100=${dw100}`;
    };
    return ("**Test Status**\n" +
        `Daily message ID: ${getDailyMessageId() ?? "unknown"}\n` +
        `Locked: ${Array.from(lockedBlocks).join(", ") || "none"}\n` +
        `${blockSummary("A")}\n` +
        `${blockSummary("B")}\n` +
        `${blockSummary("C")}`);
}
function friendlyError(err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Missing Permissions") || message.includes("50013")) {
        return "Bot is missing permissions to complete this action.";
    }
    if (message.includes("Missing Access")) {
        return "Bot lacks access to the channel or guild.";
    }
    if (message.includes("Missing Permissions") || message.includes("hierarchy")) {
        return "Role hierarchy issue: bot role must be above Deep Work roles.";
    }
    return `Command failed: ${message}`;
}
function logContext(label, data) {
    console.error(`[test-mode] ${label}`, data);
}
export async function handleTestCommands(message) {
    if (!message.guild || message.author.bot)
        return false;
    const content = message.content.trim();
    if (!content.startsWith("!"))
        return false;
    const [command, ...args] = content.slice(1).split(/\s+/);
    if (!command.startsWith("test_"))
        return false;
    if (!(await isAdmin(message))) {
        await message.reply("You are not authorized to use test commands.");
        return true;
    }
    try {
        if (command === "test_post_daily") {
            await postDailyForGuild(message.client, message.guildId ?? "");
            await message.reply("Posted and pinned daily message.");
            return true;
        }
        if (command === "test_sync_from_reactions") {
            await syncFromReactionsForGuild(message.client, message.guildId ?? "");
            await message.reply("Synced signups from reactions.");
            return true;
        }
        if (command === "test_lock") {
            const block = (args[0] || "").toUpperCase();
            if (!block || !["A", "B", "C"].includes(block)) {
                await message.reply("Usage: !test_lock <A|B|C>");
                return true;
            }
            await lockBlockNow(message.client, message.guildId ?? "", block, {
                force: true,
            });
            await message.reply(`Locked block ${block}.`);
            return true;
        }
        if (command === "test_start") {
            const block = (args[0] || "").toUpperCase();
            if (!block || !["A", "B", "C"].includes(block)) {
                await message.reply("Usage: !test_start <A|B|C>");
                return true;
            }
            await sendBlockStartMessages(message.client, message.guildId ?? "", block, {
                force: true,
            });
            await message.reply(`Started block ${block}.`);
            return true;
        }
        if (command === "test_timer") {
            const block = (args[0] || "").toUpperCase();
            const marker = Number(args[1]);
            if (!block || !["A", "B", "C"].includes(block)) {
                await message.reply("Usage: !test_timer <A|B|C> <50|60|100>");
                return true;
            }
            if (![50, 60, 100].includes(marker)) {
                await message.reply("Usage: !test_timer <A|B|C> <50|60|100>");
                return true;
            }
            await sendTimerMarkers(message.client, message.guildId ?? "", block, marker, { force: true });
            await message.reply(`Timer ${marker} for block ${block} sent.`);
            return true;
        }
        if (command === "test_run_timers") {
            const block = (args[0] || "").toUpperCase();
            if (!block || !["A", "B", "C"].includes(block)) {
                await message.reply("Usage: !test_run_timers <A|B|C>");
                return true;
            }
            for (const marker of [50, 60, 100]) {
                await sendTimerMarkers(message.client, message.guildId ?? "", block, marker, { force: true });
            }
            await message.reply(`Timers for block ${block} sent.`);
            return true;
        }
        if (command === "test_end") {
            const block = (args[0] || "").toUpperCase();
            if (!block || !["A", "B", "C"].includes(block)) {
                await message.reply("Usage: !test_end <A|B|C>");
                return true;
            }
            await endBlockNow(message.client, message.guildId ?? "", block, {
                force: true,
            });
            await message.reply(`Ended block ${block}.`);
            return true;
        }
        if (command === "test_reset_day") {
            await resetDaily(message.client, message.guildId ?? "");
            await message.reply("Reset daily message.");
            return true;
        }
        if (command === "test_status") {
            await message.reply(formatState());
            return true;
        }
    }
    catch (err) {
        await message.reply(friendlyError(err));
        return true;
    }
    await message.reply("Unknown test command.");
    return true;
}
export function buildTestCommands() {
    return [
        new SlashCommandBuilder().setName("test_post_daily").setDescription("Post and pin daily message"),
        new SlashCommandBuilder()
            .setName("test_sync_from_reactions")
            .setDescription("Sync signups from reactions"),
        new SlashCommandBuilder()
            .setName("test_lock")
            .setDescription("Lock a block")
            .addStringOption((opt) => opt
            .setName("block")
            .setDescription("Block A, B, or C")
            .setRequired(true)
            .addChoices({ name: "A", value: "A" }, { name: "B", value: "B" }, { name: "C", value: "C" })),
        new SlashCommandBuilder()
            .setName("test_start")
            .setDescription("Start a block")
            .addStringOption((opt) => opt
            .setName("block")
            .setDescription("Block A, B, or C")
            .setRequired(true)
            .addChoices({ name: "A", value: "A" }, { name: "B", value: "B" }, { name: "C", value: "C" })),
        new SlashCommandBuilder()
            .setName("test_timer")
            .setDescription("Fire a timer marker")
            .addStringOption((opt) => opt
            .setName("block")
            .setDescription("Block A, B, or C")
            .setRequired(true)
            .addChoices({ name: "A", value: "A" }, { name: "B", value: "B" }, { name: "C", value: "C" }))
            .addIntegerOption((opt) => opt
            .setName("t")
            .setDescription("Offset minutes")
            .setRequired(true)
            .addChoices({ name: "50", value: 50 }, { name: "60", value: 60 }, { name: "100", value: 100 })),
        new SlashCommandBuilder()
            .setName("test_run_timers")
            .setDescription("Fire all timers for a block")
            .addStringOption((opt) => opt
            .setName("block")
            .setDescription("Block A, B, or C")
            .setRequired(true)
            .addChoices({ name: "A", value: "A" }, { name: "B", value: "B" }, { name: "C", value: "C" })),
        new SlashCommandBuilder()
            .setName("test_end")
            .setDescription("End a block")
            .addStringOption((opt) => opt
            .setName("block")
            .setDescription("Block A, B, or C")
            .setRequired(true)
            .addChoices({ name: "A", value: "A" }, { name: "B", value: "B" }, { name: "C", value: "C" })),
        new SlashCommandBuilder().setName("test_reset_day").setDescription("Reset daily message"),
        new SlashCommandBuilder().setName("test_status").setDescription("Show internal state"),
    ];
}
export async function registerTestCommands(clientId, guildId) {
    const { REST, Routes } = await import("discord.js");
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN ?? "");
    const commands = buildTestCommands().map((c) => c.toJSON());
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
}
export async function handleTestInteraction(interaction) {
    if (!interaction.guildId)
        return false;
    if (!interaction.commandName.startsWith("test_"))
        return false;
    if (!isAdminInteraction(interaction)) {
        await interaction.reply({
            content: "You are not authorized to use test commands.",
            ephemeral: true,
        });
        return true;
    }
    try {
        await interaction.deferReply({ ephemeral: true });
        const block = interaction.options.getString("block")?.toUpperCase();
        const marker = interaction.options.getInteger("t") ?? undefined;
        logContext("interaction", {
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            command: interaction.commandName,
            block,
            marker,
        });
        if (interaction.commandName === "test_post_daily") {
            await postDailyForGuild(interaction.client, interaction.guildId);
            await interaction.editReply("Posted and pinned daily message.");
            return true;
        }
        if (interaction.commandName === "test_sync_from_reactions") {
            await syncFromReactionsForGuild(interaction.client, interaction.guildId);
            await interaction.editReply("Synced signups from reactions.");
            return true;
        }
        if (interaction.commandName === "test_lock") {
            if (!block) {
                await interaction.editReply("Block required.");
                return true;
            }
            await lockBlockNow(interaction.client, interaction.guildId, block, { force: true });
            await interaction.editReply(`Locked block ${block}.`);
            return true;
        }
        if (interaction.commandName === "test_start") {
            if (!block) {
                await interaction.editReply("Block required.");
                return true;
            }
            await sendBlockStartMessages(interaction.client, interaction.guildId, block, { force: true });
            await interaction.editReply(`Started block ${block}.`);
            return true;
        }
        if (interaction.commandName === "test_timer") {
            if (!block || !marker || ![50, 60, 100].includes(marker)) {
                await interaction.editReply("Usage: /test_timer block=<A|B|C> t=<50|60|100>");
                return true;
            }
            await sendTimerMarkers(interaction.client, interaction.guildId, block, marker, { force: true });
            await interaction.editReply(`Timer ${marker} for block ${block} sent.`);
            return true;
        }
        if (interaction.commandName === "test_run_timers") {
            if (!block) {
                await interaction.editReply("Block required.");
                return true;
            }
            for (const m of [50, 60, 100]) {
                await sendTimerMarkers(interaction.client, interaction.guildId, block, m, { force: true });
            }
            await interaction.editReply(`Timers for block ${block} sent.`);
            return true;
        }
        if (interaction.commandName === "test_end") {
            if (!block) {
                await interaction.editReply("Block required.");
                return true;
            }
            await endBlockNow(interaction.client, interaction.guildId, block, { force: true });
            await interaction.editReply(`Ended block ${block}.`);
            return true;
        }
        if (interaction.commandName === "test_reset_day") {
            await resetDaily(interaction.client, interaction.guildId);
            await interaction.editReply("Reset daily message.");
            return true;
        }
        if (interaction.commandName === "test_status") {
            await interaction.editReply(formatState());
            return true;
        }
    }
    catch (err) {
        logContext("error", {
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            command: interaction.commandName,
            error: err instanceof Error ? err.message : String(err),
        });
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(friendlyError(err));
        }
        else {
            await interaction.reply({ content: friendlyError(err), ephemeral: true });
        }
        return true;
    }
    return false;
}
