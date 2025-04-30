import db from "./database/db";
import { startServer } from "./server";

(async function run() {
    try {
        await db.migrate.latest();
        console.log("Migrations complete.");

        startServer();
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
