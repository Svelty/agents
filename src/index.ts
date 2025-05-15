import { runInboxBot, scheduleBots } from "./agent/agents/emailLeadsReply";
import db from "./database/db";
import { startServer } from "./server";
import {
    breakTimesIntoSlots,
    getAvailableTimes,
    getNextThreadWithUnreadMessage,
    listCalendarEvents,
} from "./service/googleService";

(async function run() {
    try {
        await db.migrate.latest();
        console.log("Migrations complete.");

        // const res = await getAvailableTimes();
        // console.log(res);
        // const res2 = breakTimesIntoSlots(res, 15);
        // console.log(res2);

        // const res = await listCalendarEvents();
        // console.log(res);

        startServer();

        scheduleBots();
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
})();

// (async function run() {
//     // await createModelRequest();
//     // const res = await ping();
//     const res = await listCoinsWithMarketData();
//     console.log(res);
//     console.log("Model request completed");
// })();

// (async function run() {
//     // await createModelRequest();
//     // const res = await ping();
//     const res = await listUnreadMessages();
//     console.log(res);
//     console.log("request completed");
// })();

// (async function run() {
//     // await createModelRequest();
//     // const res = await ping();
//     // const res = await getNextUnreadMessageThread();
//     const res = await runEmailBot("", "");
//     console.log(res);
//     console.log("request completed");
// })();
