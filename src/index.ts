import dotenv from "dotenv";
import express, { Request, Response } from "express";
import session from "express-session";
import { runLolAgent } from "./agent/agents/lolAgent";
import { runSimpleAddingAgent } from "./agent/agents/testMathAgent";
import { runStoryBot } from "./agent/agents/storybot";
import { listCoins, listCoinsWithMarketData, ping } from "./client/coinGeko";
import {
    getNextUnreadMessageThread,
    listUnreadMessages,
    runEmailBot,
} from "./agent/agents/emailLeadsReply";

// const session = require('express-session');

// const express = require('express')

const app = express();
const port = 3001;

app.use(express.json());

app.use(
    session({
        secret: "your-secret-key", // should be a strong, random string
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // set to true if using HTTPS
            maxAge: 1000 * 60 * 60 * 24, // 1 day
        },
    })
);

//if using proxy
// app.set('trust proxy', 1);

app.get("/", (req: Request, res: Response) => {
    res.send("Hello World!");
});

// app.get("/login", (req: Request, res: Response) => {
//     req.session.userId = "12345"; // Store data in session
//     res.send("Logged in");
// });

// app.get("/logout", (req: Request, res: Response) => {
//     req.session.destroy(() => {
//         res.send("Logged out");
//     });
// });

// app.get("/dashboard", (req: Request, res: Response) => {
//     if (req.session.userId) {
//         res.send(`Hello user ${req.session.userId}`);
//     } else {
//         res.status(401).send("Unauthorized");
//     }
// });

//don't like this at all but for now its easy
let storySessionId = 1;
app.get("/increment-story-session-id", (req: Request, res: Response) => {
    storySessionId++;
    res.send(`storySessionId: ${storySessionId}`);
});

interface StoryBotChatRequest {
    text: string;
}

//this will be the main endpoint for the app
app.post(
    "/story-bot-chat",
    async (req: Request<{}, {}, StoryBotChatRequest>, res: Response) => {
        const { text } = req.body;
        const response = await runStoryBot(text, storySessionId.toString());

        res.send(response);
    }
);
// if (req.session.userId) {
// } else {
//     res.status(401).send("Unauthorized");
// }

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

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

(async function run() {
    // await createModelRequest();
    // const res = await ping();
    // const res = await getNextUnreadMessageThread();
    const res = await runEmailBot("", "");
    console.log(res);
    console.log("request completed");
})();
