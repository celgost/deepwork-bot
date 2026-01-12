import { CHANNELS, EMOJIS, REACTION_MAP } from "./config.js";
import { updateDailyMessage } from "./attendees.js";
import { clearSignup, isBlockLocked, setSignup } from "./signup.js";
const BLOCK_EMOJIS = {
    A: [EMOJIS.A_DW50, EMOJIS.A_DW100],
    B: [EMOJIS.B_DW50, EMOJIS.B_DW100],
    C: [EMOJIS.C_DW50, EMOJIS.C_DW100],
};
export async function handleReactionAdd(reaction, user) {
    if (reaction.partial) {
        reaction = await reaction.fetch();
    }
    if (user.partial) {
        user = await user.fetch();
    }
    if (user.bot)
        return;
    const message = reaction.message.partial
        ? await reaction.message.fetch()
        : reaction.message;
    if (message.channelId !== CHANNELS.deepWorkText)
        return;
    if (!message.pinned)
        return;
    if (!message.author || message.author.bot !== true)
        return;
    const emoji = reaction.emoji.name;
    if (!emoji)
        return;
    const mapping = REACTION_MAP[emoji];
    if (!mapping)
        return;
    const { block, mode } = mapping;
    if (isBlockLocked(block))
        return;
    setSignup(block, user.id, mode);
    const otherEmojis = BLOCK_EMOJIS[block].filter((e) => e !== emoji);
    for (const other of otherEmojis) {
        const existing = message.reactions.cache.get(other);
        if (existing) {
            await existing.users.remove(user.id);
        }
    }
    if (message.guildId) {
        await updateDailyMessage(message.client, message.guildId);
    }
}
export async function handleReactionRemove(reaction, user) {
    if (reaction.partial) {
        reaction = await reaction.fetch();
    }
    if (user.partial) {
        user = await user.fetch();
    }
    if (user.bot)
        return;
    const message = reaction.message.partial
        ? await reaction.message.fetch()
        : reaction.message;
    if (message.channelId !== CHANNELS.deepWorkText)
        return;
    if (!message.pinned)
        return;
    if (!message.author || message.author.bot !== true)
        return;
    const emoji = reaction.emoji.name;
    if (!emoji)
        return;
    const mapping = REACTION_MAP[emoji];
    if (!mapping)
        return;
    const { block } = mapping;
    if (isBlockLocked(block))
        return;
    clearSignup(block, user.id);
    if (message.guildId) {
        await updateDailyMessage(message.client, message.guildId);
    }
}
