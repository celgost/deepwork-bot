import { BLOCKS, EMOJIS } from "./config.js";
import { getDailyBlockTimestamps } from "./time.js";

type AttendeeList = Record<string, string[]>;

const EMPTY = "No one yet";

function formatNames(list: string[] | undefined): string {
  if (!list || list.length === 0) return EMPTY;
  return list.join(", ");
}

export function buildDailyMessage(
  date?: Date,
  attendees?: Partial<AttendeeList>,
  lockedBlocks?: Set<keyof typeof BLOCKS>
): string {
  const times = getDailyBlockTimestamps(date);

  const aDw50 = formatNames(attendees?.[EMOJIS.A_DW50]);
  const aDw100 = formatNames(attendees?.[EMOJIS.A_DW100]);
  const bDw50 = formatNames(attendees?.[EMOJIS.B_DW50]);
  const bDw100 = formatNames(attendees?.[EMOJIS.B_DW100]);
  const cDw50 = formatNames(attendees?.[EMOJIS.C_DW50]);
  const cDw100 = formatNames(attendees?.[EMOJIS.C_DW100]);
  const dDw50 = formatNames(attendees?.[EMOJIS.D_DW50]);
  const dDw100 = formatNames(attendees?.[EMOJIS.D_DW100]);

  const a = times.A;
  const b = times.B;
  const c = times.C;
  const d = times.D;

  return (
    "**Deep Work Today**\n\n" +
    "**A**  \n" +
    `Starts <t:${a.startTs}:t>  \n` +
    `Ends <t:${a.endTs}:t>  \n` +
    `${lockedBlocks?.has("A") ? "🔒 Locked" : `🔒 Locks <t:${a.lockTs}:R>`}\n\n` +
    `${EMOJIS.A_DW50} Deep Work 50  \n` +
    `${aDw50}\n\n` +
    `${EMOJIS.A_DW100} Deep Work 100  \n` +
    `${aDw100}\n\n` +
    "**B**  \n" +
    `Starts <t:${b.startTs}:t>  \n` +
    `Ends <t:${b.endTs}:t>  \n` +
    `${lockedBlocks?.has("B") ? "🔒 Locked" : `🔒 Locks <t:${b.lockTs}:R>`}\n\n` +
    `${EMOJIS.B_DW50} Deep Work 50  \n` +
    `${bDw50}\n\n` +
    `${EMOJIS.B_DW100} Deep Work 100  \n` +
    `${bDw100}\n\n` +
    "**C**  \n" +
    `Starts <t:${c.startTs}:t>  \n` +
    `Ends <t:${c.endTs}:t>  \n` +
    `${lockedBlocks?.has("C") ? "🔒 Locked" : `🔒 Locks <t:${c.lockTs}:R>`}\n` +
    `\n${EMOJIS.C_DW50} Deep Work 50  \n` +
    `${cDw50}\n\n` +
    `${EMOJIS.C_DW100} Deep Work 100\n` +
    `${cDw100}\n\n` +
    "**D**  \n" +
    `Starts <t:${d.startTs}:t>  \n` +
    `Ends <t:${d.endTs}:t>  \n` +
    `${lockedBlocks?.has("D") ? "🔒 Locked" : `🔒 Locks <t:${d.lockTs}:R>`}\n\n` +
    `${EMOJIS.D_DW50} Deep Work 50  \n` +
    `${dDw50}\n\n` +
    `${EMOJIS.D_DW100} Deep Work 100  \n` +
    `${dDw100}\n\n` +
    "React to join. You can change or cancel anytime before each block locks."
  );
}
