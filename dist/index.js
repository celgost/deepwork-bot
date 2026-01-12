import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import cron from "node-cron";
import { resetDaily } from "./reset.js";
import { handleReactionAdd, handleReactionRemove } from "./reactions.js";
import { scheduleBlockLocks } from "./lock.js";
import { scheduleBlockStarts } from "./blockStart.js";
import { scheduleTimerMarkers } from "./timers.js";
import { scheduleBlockEnds } from "./blockEnd.js";
import { initStatePersistence } from "./state.js";
import { runStartupRecovery } from "./recovery.js";
import { handleTestCommands, handleTestInteraction, registerTestCommands } from "./testMode.js";
import { TEST_MODE } from "./config.js";
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
if (!token || !guildId) {
    console.error("Missing DISCORD_TOKEN or GUILD_ID in environment.");
    process.exit(1);
}
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User],
});
client.once("clientReady", (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    console.log(`Target guild: ${guildId}`);
    initStatePersistence()
        .then(() => {
        return runStartupRecovery(client, guildId);
    })
        .then(() => {
        if (TEST_MODE) {
            return registerTestCommands(c.user.id, guildId);
        }
        return undefined;
    })
        .then(() => {
        if (!TEST_MODE) {
            scheduleBlockLocks(client, guildId);
            scheduleBlockStarts(client, guildId);
            scheduleTimerMarkers(client, guildId);
            scheduleBlockEnds(client, guildId);
        }
    })
        .catch((err) => {
        console.error("Failed to initialize state persistence:", err);
    });
});
client.on("messageReactionAdd", (reaction, user) => {
    handleReactionAdd(reaction, user).catch((err) => {
        console.error("Reaction add handler failed:", err);
    });
});
client.on("messageReactionRemove", (reaction, user) => {
    handleReactionRemove(reaction, user).catch((err) => {
        console.error("Reaction remove handler failed:", err);
    });
});
client.on("messageCreate", (message) => {
    handleTestCommands(message).catch((err) => {
        console.error("Test command handler failed:", err);
    });
});
client.on("interactionCreate", (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    handleTestInteraction(interaction).catch((err) => {
        console.error("Test interaction handler failed:", err);
    });
});
if (!TEST_MODE) {
    cron.schedule("5 0 * * *", () => {
        resetDaily(client, guildId).catch((err) => {
            console.error("Daily reset failed:", err);
        });
    }, { timezone: "Europe/Paris" });
}
client.login(token).catch((err) => {
    console.error("Failed to login:", err);
    process.exit(1);
});
