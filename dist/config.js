export const TIMEZONE = "Europe/Paris";
export const ROLES = {
    deepWork50: "1460302122036760773",
    deepWork100: "1460302158913081488",
};
export const ID_REGEX = /^\d{17,20}$/;
export const CHANNELS = {
    deepWorkText: "1460302949690380449",
    deepWork50Voice: "1460302022191354162",
    deepWork100Voice: "1460302066051322119",
};
export const ADMIN_IDS = ["1394665168428073155"];
export const ADMIN_ROLE_ID = "1447991617788051507";
export const TESTER_IDS = ["1394665168428073155", "1224162929134407691"];
export const TEST_MODE = true;
export const BLOCKS = {
    A: {
        label: "A",
        start: "14:00",
        end: "16:00",
        lockMinutesBefore: 5,
    },
    B: {
        label: "B",
        start: "18:00",
        end: "20:00",
        lockMinutesBefore: 5,
    },
    C: {
        label: "C",
        start: "22:00",
        end: "00:00",
        lockMinutesBefore: 5,
    },
};
export const EMOJIS = {
    A_DW50: "1️⃣",
    A_DW100: "2️⃣",
    B_DW50: "3️⃣",
    B_DW100: "4️⃣",
    C_DW50: "5️⃣",
    C_DW100: "6️⃣",
};
export const REACTION_MAP = {
    "1️⃣": { block: "A", mode: "DW50" },
    "2️⃣": { block: "A", mode: "DW100" },
    "3️⃣": { block: "B", mode: "DW50" },
    "4️⃣": { block: "B", mode: "DW100" },
    "5️⃣": { block: "C", mode: "DW50" },
    "6️⃣": { block: "C", mode: "DW100" },
};
