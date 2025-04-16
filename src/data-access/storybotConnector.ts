import { text } from "express";
import knex from "knex";

const pg = knex({
    client: "pg",
    connection: {
        //   connectionString: config.DATABASE_URL,
        host: "localhost", //config['DB_HOST'],
        port: 5432, //config['DB_PORT'],
        user: "postgres", //config['DB_USER'],
        database: "story-bot", //config['DB_NAME'],
        password: "postgres", // config['DB_PASSWORD'],
        ssl: false, //config['DB_SSL'] ? { rejectUnauthorized: false } : false,
    },
});

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
    const [{ id }] = await pg("story")
        .insert(story)
        .returning<{ id: number }[]>("id");
    return id;
};

export const getStory = async (id: number): Promise<Story | undefined> => {
    return pg("story").where({ id }).first();
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
    const [{ id }] = await pg("story_chunks")
        .insert(chunk)
        .returning<{ id: number }[]>("id");
    return id;
};

export const updateStoryChunkImage = async (
    chunkId: number,
    imageUrl: string,
    description?: string
): Promise<void> => {
    if (description) {
        await pg("story_chunks")
            .where({ id: chunkId })
            .update({ image_url: imageUrl, image_prompt: description });
    } else {
        await pg("story_chunks")
            .where({ id: chunkId })
            .update({ image_url: imageUrl });
    }
};

export const getChunksForStory = async (
    storyId: number
): Promise<StoryChunk[]> => {
    return pg("story_chunks").where({ story_id: storyId });
};

export const getStoryChunkByIndex = async (
    storyId: number,
    index: number
): Promise<StoryChunk[]> => {
    return pg("story_chunks").where({ story_id: storyId, index: index });
};
