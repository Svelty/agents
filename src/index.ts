import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { runLolAgent } from "./agent/agents/lolAgent";
import { runSimpleAddingAgent } from "./agent/agents/testMathAgent";

// const express = require('express')

// const app = express();
// const port = 3000;

// app.get("/", (req: Request, res: Response) => {
//   res.send("Hello World!");
// });

// app.post("/lol-agent", async (req: Request, res: Response) => {
//   res.send("Hello World!");
// });

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });

// createModelRequest();

// console.log("uuuh");

// (async function run() {
//     // await createModelRequest();
//     await runLolAgent();
//     console.log("Model request completed");
// })();

(async function run() {
    // await createModelRequest();
    await runSimpleAddingAgent();
    console.log("Model request completed");
})();
