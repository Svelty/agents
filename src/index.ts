import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { runLolAgent } from "./agent/agents/lolAgent";
import { runSimpleAddingAgent } from "./agent/agents/testMathAgent";
import { runStoryBot } from "./agent/agents/storybot";
import { generateImage } from "./client/image-gen";

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

// (async function run() {
//     // await createModelRequest();
//     await runSimpleAddingAgent();
//     console.log("Model request completed");
// })();

(async function run() {
    // await createModelRequest();
    await runStoryBot();
    console.log("Model request completed");
})();

// (async function run() {
//     const imageLocations = await generateImage({
//         prompt: "romantic scene looking out the window of a space station",
//         negativePrompt:
//             "(embedding:unaestheticXLv31:0.8), low quality, watermark",
//         baseModelName: "bluePencilXL_v050.safetensors",
//         refinerModelName: "bluePencilXL_v050.safetensors",
//         refinerSwitch: 0.667,
//         imageSeed: BigInt.asUintN(
//             64,
//             BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) *
//                 BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
//         ).toString(),
//         imageNumber: 2,
//         performanceSelection: "Quality",
//         styleSelections: [], // Assuming this was meant to be an empty array
//         aspectRatiosSelection: "1152×896",
//         enablePreviewImages: false,
//         loraParameters: [
//             { model: "None", weight: 0 },
//             { model: "None", weight: 0 },
//             { model: "None", weight: 0 },
//             { model: "None", weight: 0 },
//             { model: "None", weight: 0 },
//         ],
//     });

//     console.log(imageLocations);
// })();
