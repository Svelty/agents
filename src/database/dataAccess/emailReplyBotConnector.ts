import db from "../db";

type Message = {
    id?: number;
    thread_text?: string;
    is_thread_text_truncated: boolean;
    reply_address?: string;
    last_message_id?: string;
    thread_id?: string;
    subject?: string;
    message_type?: string;
    is_replied_to: boolean;
    created_at?: Date;
    updated_at?: Date;
};

export const createMessage = async (
    message: Omit<Message, "id" | "created_at" | "updated_at">
): Promise<number> => {
    const [{ id }] = await db("messages")
        .insert(message)
        .returning<{ id: number }[]>("id");
    return id;
};

export const getMessage = async (id: number): Promise<Message | undefined> => {
    return db("messages").where({ id }).first();
};

export const getAllMessages = async (): Promise<Message[]> => {
    return db("messages").select();
};

export const getAllUnrepliedMessages = async (): Promise<Message[]> => {
    return db("messages").where({ is_replied_to: false }).select();
};

export const markMessageReplied = async (id: number): Promise<void> => {
    return await db("messages")
        .where({ id })
        .update({ is_replied_to: true, updated_at: db.fn.now() });
};
