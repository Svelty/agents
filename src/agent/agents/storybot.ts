import { generateImage } from "../../client/image-gen";
import {
    createStory,
    createStoryChunk,
    getChunksForStory,
    getStory,
    updateStoryChunkImage,
} from "../../data-access/storybotConnector";
import { AgentService } from "../agent";

export const runStoryBot = async () => {
    const agent = new AgentService();

    //@ts-ignore
    const createStoryTool = agent.addFunctionTool({
        type: "function",
        name: "createStory",
        description: "Saves a story to the story table in the story-bot db",
        strict: true,

        parameters: {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "The title of the story",
                },
                storyText: {
                    type: "string",
                    description: "The text of the story",
                },
            },
            required: ["title", "storyText"],
            additionalProperties: false,
        },
        functionToCall: createStory,
    });

    //@ts-ignore
    const getStoryTool = agent.addFunctionTool({
        type: "function",
        name: "getStory",
        description:
            "gets a story saved to the story table in the story-bot db",
        strict: true,

        parameters: {
            type: "object",
            properties: {
                storyId: {
                    type: "string",
                    description: "The id of the story",
                },
            },
            required: ["storyId"],
            additionalProperties: false,
        },
        functionToCall: getStory,
    });

    //@ts-ignore
    const createStoryChunksTool = agent.addFunctionTool({
        type: "function",
        name: "createStoryChunks",
        description:
            "Saves the chunks of a story to the story-chunk table in the story-bot db", //max 280 char
        strict: true,

        parameters: {
            type: "object",
            properties: {
                storyId: {
                    type: "number",
                    description: "the id of the story",
                },
                storyTextArray: {
                    type: "array",
                    description: "The text of the story broken into chuncks",
                    items: {
                        type: "string",
                    },
                },
            },
            required: ["storyId", "storyTextArray"],
            additionalProperties: false,
        },
        functionToCall: async (storyId, storyTextArray) => {
            let i = 0;
            for (const chunk of storyTextArray) {
                i++;
                await createStoryChunk(storyId, chunk, i);
            }
            return {
                storyId: storyId,
                chunks: i,
            };
        },
    });

    // agent.addFunctionTool({
    //     type: "function",
    //     name: "createImagesForAllChunks",
    //     description:
    //         "Creates images for all chunks of a story, saves the images to the file system and updates the story-chunk table with their location", //max 280 char
    //     strict: true,

    //     parameters: {
    //         type: "object",
    //         properties: {
    //             storyId: {
    //                 type: "number",
    //                 description: "the id of the story",
    //             },
    //             prompt: {
    //                 type: "string",
    //                 description:
    //                     "A base prompt that will be passed to the image generator with each chunk",
    //             },
    //         },
    //         required: ["storyId", "prompt"],
    //         additionalProperties: false,
    //     },
    //     functionToCall: async (storyId, prompt) => {
    //         const chunks = await getChunksForStory(storyId);

    //         const allImageLocations = [];
    //         for (const chunk of chunks) {
    //             const imageLocations = await generateImage({
    //                 prompt: prompt + " : " + chunk.text,
    //                 negativePrompt:
    //                     "(embedding:unaestheticXLv31:0.8), low quality, watermark",
    //                 baseModelName: "animagineXLV31_v31.safetensors", //"DreamShaper_8_pruned.safetensors", //"bluePencilXL_v050.safetensors",
    //                 refinerModelName: "animagineXLV31_v31.safetensors", //"DreamShaper_8_pruned.safetensors", //"bluePencilXL_v050.safetensors",
    //                 refinerSwitch: 0.667,
    //                 imageSeed: "2234205261968679285",
    //                 imageNumber: 2,
    //                 performanceSelection: "Quality",
    //                 styleSelections: [
    //                     "Fooocus V2",
    //                     "Fooocus Masterpiece",
    //                     "SAI Enhance",
    //                 ], //[], // Assuming this was meant to be an empty array
    //                 aspectRatiosSelection: "1152×896",
    //                 enablePreviewImages: false,
    //                 loraParameters: [
    //                     { model: "None", weight: 0 },
    //                     { model: "None", weight: 0 },
    //                     { model: "None", weight: 0 },
    //                     { model: "None", weight: 0 },
    //                     { model: "None", weight: 0 },
    //                 ],
    //             });

    //             if (
    //                 Array.isArray(imageLocations) &&
    //                 imageLocations.length > 0
    //             ) {
    //                 updateStoryChunkImage(chunk.id!, imageLocations[0]);
    //             }
    //         }
    //         return "success";
    //     },
    // });

    agent.addFunctionTool({
        type: "function",
        name: "getChunksForStory",
        description: "Gets all the chunks for a story", //max 280 char
        strict: true,

        parameters: {
            type: "object",
            properties: {
                storyId: {
                    type: "number",
                    description: "the id of the story",
                },
            },
            required: ["storyId"],
            additionalProperties: false,
        },
        functionToCall: getChunksForStory,
    });

    agent.addFunctionTool({
        type: "function",
        name: "createImagesForChunks",
        description:
            "Creates images for the chunks of a story, saves the images to the file system and updates the story-chunk table with their location", //max 280 char
        strict: true,

        parameters: {
            type: "object",
            properties: {
                storyId: {
                    type: "number",
                    description: "the id of the story",
                },
                prompts: {
                    type: "array",
                    description:
                        "An arry of a description of each chunk and the chunk id",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "number",
                                description: "The ID of the chunk",
                            },
                            description: {
                                type: "string",
                                description: "The description of the chunk",
                            },
                        },
                        additionalProperties: false,
                        required: ["id", "description"],
                    },
                },
            },
            required: ["storyId", "prompts"],
            additionalProperties: false,
        },
        functionToCall: async (storyId, prompts) => {
            const allImageLocations = [];
            for (const prompt of prompts) {
                const imageLocations = await generateImage(
                    {
                        prompt: prompt.description,
                        negativePrompt:
                            "(embedding:unaestheticXLv31:0.8), low quality, watermark",
                        baseModelName:
                            "dreamshaperXL_v21TurboDPMSDE.safetensors", //animagineXLV31_v31.safetensors", //"DreamShaper_8_pruned.safetensors", //"bluePencilXL_v050.safetensors",
                        refinerModelName:
                            "dreamshaperXL_v21TurboDPMSDE.safetensors", //animagineXLV31_v31.safetensors", //"DreamShaper_8_pruned.safetensors", //"bluePencilXL_v050.safetensors",
                        refinerSwitch: 0.667,
                        imageSeed: "2234205261968679285",
                        imageNumber: 1,
                        performanceSelection: "Quality",
                        styleSelections: [
                            "Fooocus V2",
                            "Fooocus Masterpiece",
                            "SAI Enhance",
                        ], //[], // Assuming this was meant to be an empty array
                        aspectRatiosSelection: "1152×896",
                        enablePreviewImages: false,
                        loraParameters: [
                            { model: "None", weight: 0 },
                            { model: "None", weight: 0 },
                            { model: "None", weight: 0 },
                            { model: "None", weight: 0 },
                            { model: "None", weight: 0 },
                        ],
                    },
                    `${storyId}-${prompt.id}`
                );

                if (
                    Array.isArray(imageLocations) &&
                    imageLocations.length > 0
                ) {
                    updateStoryChunkImage(
                        prompt.id!,
                        imageLocations[0],
                        prompt.description
                    );
                }
            }
            return "success";
        },
    });

    // const agentRequest = {
    //     model: "gpt-4o-mini", // $.25  //"gpt-4o" $2.50, o3-mini $1.10
    //     input: ,
    //     instructions:
    //         "You are an author that write spicy romance sci fi short stories in the style of Linnea Sinclair",
    //     previous_response_id: null,
    //     store: false, //Whether to store the generated model response for later retrieval via API. boolean | null;
    //     user: "me", //unique id that can identify end user
    //     //@ts-ignore
    //     tools: [createStoryTool],
    // };

    // const functionResultsRequest = {
    //     model: "gpt-4o-mini", // $.25  //"gpt-4o" $2.50, o3-mini $1.10 -- dont use o3 use o1
    //     input: "",
    //     instructions:
    //         "Take this story and break it up into chunks of no longer than 250 characters, make sure each chunk can stand on its own",
    //     // previous_response_id: firstRes.id,  -- i think i need to save response for this to work?
    //     store: false, //Whether to store the generated model response for later retrieval via API. boolean | null;
    //     user: "me", //unique id that can identify end user
    // };

    // const results = await agent.runFunctionCallingAgent(
    //     "First, write a short story about two lovers on a distant planet far in the future then save it to the story db. " +
    //         "Second, get that story from the db and break it into chunks of no longer than 250 characters making sure each chunk has only full sentences and makes sense on its own then save those chunks to the db. " +
    //         "Third, get the chunks for the story and create a prompt describing each chunk that can be passed to an image generator along with the story text and then generate the images",
    //     "You are an author that writes sci fi romance short stories"
    // );

    const results = await agent.runFunctionCallingAgent(
        "First, write a short story about a battle between giant robots batteling giant lizards on a distant planet the robots have been sent by humans to concour the planet, then save it to the story db. " +
            "Second, get that story from the db and break it into chunks of no longer than 250 characters making sure each chunk has only full sentences and makes sense on its own then save those chunks to the db. " +
            "Third, get the chunks for the story and write a vidual description of each chunk then use those descriptions to generate images for each chunk",
        "You are an author that writes epic sci fi battle short stories"
    );

    //Ok so this succesfully generates a story and saves it to postgress, at this point i should return the story to a user interface where it can be edited

    console.log(results);

    //generate a story
    //maybe an edit step
    //break story into tweet size peices
    //generate image for each part
    //save story to DB for human review
    //after human review get story by id from db and publish to twitter
    //post to twitter
};
