import { ResponseInput } from "openai/resources/responses/responses";
import { generateImage } from "../../client/image-gen";
import {
    createStory,
    createStoryChunk,
    getAllStoryTitles,
    getChunksForStory,
    getStory,
    updateStoryChunkDescription,
    updateStoryChunkImage,
    updateStoryChunkText,
    updateStoryText,
    updateStoryTitle,
} from "../../data-access/storybotConnector";
import { AgentService } from "../agent";

const storySessions: Map<string, ResponseInput> = new Map();

export const runStoryBot = async (prompt: string, storySessionId: string) => {
    let input: ResponseInput = [];

    if (storySessions.has(storySessionId)) {
        input = [...storySessions.get(storySessionId)!];
    }
    input.push({ role: "user", content: prompt });

    const agent = new AgentService();

    agent.addFunctionTool({
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

    agent.addFunctionTool({
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

    agent.addFunctionTool({
        type: "function",
        name: "updateStoryText",
        description: "updates the text of a story by id",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                storyId: {
                    type: "string",
                    description: "The id of the story",
                },
                text: {
                    type: "string",
                    description: "the updated text of the story",
                },
            },
            required: ["storyId", "text"],
            additionalProperties: false,
        },
        functionToCall: updateStoryText,
    });

    agent.addFunctionTool({
        type: "function",
        name: "updateStoryTitle",
        description: "updates the title of a story by id",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                storyId: {
                    type: "string",
                    description: "The id of the story",
                },
                title: {
                    type: "string",
                    description: "the updated title of the story",
                },
            },
            required: ["storyId", "title"],
            additionalProperties: false,
        },
        functionToCall: updateStoryTitle,
    });

    //@ts-ignore
    agent.addFunctionTool({
        type: "function",
        name: "getAllStoryTitles",
        description:
            "gets a lsit of the titles and ids of all storys saved to the story table in the story-bot db",
        strict: false,
        functionToCall: getAllStoryTitles,
    });

    agent.addFunctionTool({
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
        name: "updateStoryChunkText",
        description: "updates the text of a story chunk by id",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                chunkId: {
                    type: "string",
                    description: "The id of the story chunk",
                },
                text: {
                    type: "string",
                    description: "the updated text of the story chunk",
                },
            },
            required: ["chunkId", "text"],
            additionalProperties: false,
        },
        functionToCall: updateStoryChunkText,
    });

    agent.addFunctionTool({
        type: "function",
        name: "updateStoryChunkDescription",
        description: "updates the description of a story chunk by id",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                chunkId: {
                    type: "string",
                    description: "The id of the story chunk",
                },
                description: {
                    type: "string",
                    description: "the updated description of the story chunk",
                },
            },
            required: ["chunkId", "description"],
            additionalProperties: false,
        },
        functionToCall: updateStoryChunkDescription,
    });

    agent.addFunctionTool({
        type: "function",
        name: "saveDescriptionsForAllChunksOfStory",
        description:
            "Saves the descriptions you create for all chunks of a story, the descriptions should focus on describing what you would see visually happening at that chunk of a story, descriptions will later be used by an image generation model so focus on building a prompt that can be used to create an image related to the story chunk, the image generator will not have the context of the story so each description must be self contained, do not use names instead describe the person or thing, you must make sure that the chunks are all related to the story, the array should be orded by the chunk index and include an entry for each chunk of the story ", //max 280 char
        strict: true,
        parameters: {
            type: "object",
            properties: {
                descriptions: {
                    type: "array",
                    description:
                        "An arry of a description of each chunk and the chunk id",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "number",
                                description: "The ID of the story chunk",
                            },
                            description: {
                                type: "string",
                                description:
                                    "The description of the story chunk",
                            },
                        },
                        additionalProperties: false,
                        required: ["id", "description"],
                    },
                },
            },
            required: ["descriptions"],
            additionalProperties: false,
        },
        functionToCall: (descriptions) => {
            for (const description of descriptions) {
                updateStoryChunkDescription(
                    description.id,
                    description.description
                );
            }
            return "success";
        },
    });

    agent.addFunctionTool({
        type: "function",
        name: "saveDescriptionForStoryChunk",
        description:
            "Saves the description you create for a single chunk of a story, the description should focus on describing what you would see visually happening at that chunk of a story, descriptions will later be used by an image generation model so focus on building a prompt that can be used to create an image related to the story chunk, the image generator will not have the context of the story so each description must be self contained, do not use names instead describe the person or thing,", //max 280 char
        strict: true,
        parameters: {
            type: "object",
            properties: {
                id: {
                    type: "number",
                    description: "The ID of the story chunk",
                },
                description: {
                    type: "string",
                    description: "The description of the story chunk",
                },
            },
            additionalProperties: false,
            required: ["id", "description"],
        },
        functionToCall: (id, description) => {
            updateStoryChunkDescription(id, description);
            return "success";
        },
    });

    agent.addFunctionTool({
        type: "function",
        name: "createImagesForAllChunksOfStory",
        description:
            "Creates images for all the chunks of a story, saves the images to the file system and updates the story-chunk table with their location, before calling this make sure that all the chunks for the story have descriptions", //max 280 char
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
        functionToCall: async (storyId) => {
            const chunks = await getChunksForStory(storyId);

            if (!chunks.every((item) => item.description != null)) {
                return "Some chunks for story do not have descriptions";
            }

            const allImageLocations = [];
            for (const prompt of chunks) {
                const imageLocations = await generateImage(
                    {
                        prompt: prompt.description!,
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
                        ],
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
                    updateStoryChunkImage(prompt.id!, imageLocations[0]);
                }
            }
            return "success";
        },
    });

    agent.addFunctionTool({
        type: "function",
        name: "createImageforChunk",
        description:
            "Creates an image for a story chunk, saves the image to the file system and updates the story-chunk table with its location", //max 280 char
        strict: true,
        parameters: {
            type: "object",
            properties: {
                chunkId: {
                    type: "number",
                    description: "the id of the story chunk",
                },
                description: {
                    type: "string",
                    description: "The description of the story chunk",
                },
            },
            required: ["chunkId", "description"],
            additionalProperties: false,
        },
        functionToCall: async (chunkId, description) => {
            const imageLocations = await generateImage(
                {
                    prompt: description,
                    negativePrompt:
                        "(embedding:unaestheticXLv31:0.8), low quality, watermark",
                    baseModelName: "dreamshaperXL_v21TurboDPMSDE.safetensors", //animagineXLV31_v31.safetensors", //"DreamShaper_8_pruned.safetensors", //"bluePencilXL_v050.safetensors",
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
                    ],
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
                `${chunkId}`
            );

            if (Array.isArray(imageLocations) && imageLocations.length > 0) {
                updateStoryChunkImage(chunkId, imageLocations[0], description);
            }

            return "success";
        },
    });

    const results = await agent.runFunctionCallingAgent(
        input,
        "You are an ai assistant working on a short story project, You are also a talented author that writes sci fi short stories, make sure you save any story you write."
    );

    storySessions.set(storySessionId, results);

    return results[results.length - 1];
};
