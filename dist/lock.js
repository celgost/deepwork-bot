import cron from "node-cron";
import { ChannelType } from "discord.js";
import { BLOCKS, CHANNELS, ID_REGEX, EMOJIS, ROLES, TIMEZONE, } from "./config.js";
import { buildDailyMessage } from "./message.js";
import { lockedBlocks, lockBlock, replaceBlockSignups, signupState, } from "./signup.js";
import { buildAttendeeMap } from "./attendees.js";
import { markExecuted, shouldRun } from "./state.js";
const PIN_MARKER = "**Deep Work Today**";
const BLOCK_EMOJIS = {
    A: [EMOJIS.A_DW50, EMOJIS.A_DW100],
    B: [EMOJIS.B_DW50, EMOJIS.B_DW100],
    C: [EMOJIS.C_DW50, EMOJIS.C_DW100],
};
function parseHHMM(hhmm) {
    const [hourStr, minuteStr] = hhmm.split(":");
    return { hour: Number(hourStr), minute: Number(minuteStr) };
}
function subtractMinutes(hour, minute, minutesToSubtract) {
    const total = hour * 60 + minute - minutesToSubtract;
    const wrapped = ((total % 1440) + 1440) % 1440;
    return { hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
}
function cronForLockTime(start, minutesBefore) {
    const { hour, minute } = parseHHMM(start);
    const lock = subtractMinutes(hour, minute, minutesBefore);
    return `${lock.minute} ${lock.hour} * * *`;
}
async function fetchDailyMessage(channel, client) {
    const pins = await channel.messages.fetchPins();
    const daily = pins.items.find((pin) => pin.message.author.id === client.user?.id &&
        pin.message.content.includes(PIN_MARKER));
    return daily?.message ?? null;
}
async function syncBlockFromReactions(message, block) {
    const [dw50Emoji, dw100Emoji] = BLOCK_EMOJIS[block];
    const dw50Reaction = message.reactions.cache.get(dw50Emoji);
    const dw100Reaction = message.reactions.cache.get(dw100Emoji);
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
    replaceBlockSignups(block, entries);
}
async function assignRolesForBlock(client, guildId, block) {
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
            if (!member.roles.cache.has(role50.id)) {
                await member.roles.add(role50);
            }
        }
        if (mode === "DW100" && role100) {
            if (!member.roles.cache.has(role100.id)) {
                await member.roles.add(role100);
            }
        }
    }
}
async function updateMessageLocked(client, guildId) {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
    if (!channel || channel.type !== ChannelType.GuildText)
        return;
    const textChannel = channel;
    const daily = await fetchDailyMessage(textChannel, client);
    if (!daily)
        return;
    const attendees = await buildAttendeeMap(guild);
    const content = buildDailyMessage(undefined, attendees, lockedBlocks);
    await daily.edit(content);
}
export async function lockBlockNow(client, guildId, block, options) {
    if (!options?.force) {
        if (lockedBlocks.has(block))
            return;
        const jobKey = `lock:${block}`;
        if (!shouldRun(jobKey))
            return;
    }
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(CHANNELS.deepWorkText);
    if (!channel || channel.type !== ChannelType.GuildText)
        return;
    const textChannel = channel;
    const daily = await fetchDailyMessage(textChannel, client);
    if (!daily)
        return;
    const full = await daily.fetch();
    await syncBlockFromReactions(full, block);
    lockBlock(block);
    await assignRolesForBlock(client, guildId, block);
    await updateMessageLocked(client, guildId);
    if (!options?.force) {
        const jobKey = `lock:${block}`;
        markExecuted(jobKey);
    }
}
export function scheduleBlockLocks(client, guildId) {
    const entries = Object.entries(BLOCKS);
    for (const [key, block] of entries) {
        const cronExpr = cronForLockTime(block.start, block.lockMinutesBefore);
        cron.schedule(cronExpr, () => {
            lockBlockNow(client, guildId, key).catch((err) => {
                console.error(`Block ${key} lock failed:`, err);
            });
        }, { timezone: TIMEZONE });
    }
}
