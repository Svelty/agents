// import knex from "knex";
// import dotenv from "dotenv";

import db from "../db";

// dotenv.config();

// const pg = knex({
//     client: "pg",
//     connection: {
//         database: process.env.DB_DATABASE,
//         user: process.env.DB_USER,
//         password: process.env.DB_PASSWORD,
//         host: process.env.DB_HOST,
//         port: parseInt(process.env.DB_PORT!),
//         ssl: process.env.DB_SSL == "true",
//     },
// });

type Story = {
    id?: number;
    text: string;
    is_approved?: boolean;
};

type StoryChunk = {
    id?: number;
    story_id: number;
    text: string;
    index: number;
    image_url?: string;
    description?: string;
};

export const createStory = async (
    title: string,
    storyText: string
): Promise<number> => {
    const story = {
        title,
        text: storyText,
        is_approved: false,
    };
    const [{ id }] = await db("story")
        .insert(story)
        .returning<{ id: number }[]>("id");
    return id;
};

export const getStory = async (id: number): Promise<Story | undefined> => {
    return db("story").where({ id }).first();
};

export const getAllStoryTitles = async () => {
    return await db("story").select("id", "title");
};

export const updateStoryTitle = async (
    id: number,
    title: string
): Promise<void> => {
    return await db("story").where({ id }).update({ title });
};

export const updateStoryText = async (
    id: number,
    text: string
): Promise<void> => {
    return await db("story").where({ id }).update({ text });
};

export const createStoryChunk = async (
    storyId: number,
    text: string,
    index: number
): Promise<number> => {
    const chunk = {
        story_id: storyId,
        text: text,
        index: index,
    };
    const [{ id }] = await db("story_chunks")
        .insert(chunk)
        .returning<{ id: number }[]>("id");
    return id;
};

export const updateStoryChunkText = async (
    id: number,
    text: string
): Promise<void> => {
    return await db("story_chunks").where({ id }).update({ text });
};

export const updateStoryChunkDescription = async (
    id: number,
    description: string
): Promise<void> => {
    return await db("story_chunks")
        .where({ id })
        .update({ description: description });
};

export const updateStoryChunkImage = async (
    chunkId: number,
    imageUrl: string,
    description?: string
): Promise<void> => {
    if (description) {
        return await db("story_chunks")
            .where({ id: chunkId })
            .update({ image_url: imageUrl, description: description });
    } else {
        return await db("story_chunks")
            .where({ id: chunkId })
            .update({ image_url: imageUrl });
    }
};

export const getChunksForStory = async (
    storyId: number
): Promise<StoryChunk[]> => {
    return db("story_chunks").where({ story_id: storyId });
};

export const getStoryChunkByIndex = async (
    storyId: number,
    index: number
): Promise<StoryChunk[]> => {
    return db("story_chunks").where({ story_id: storyId, index: index });
};
