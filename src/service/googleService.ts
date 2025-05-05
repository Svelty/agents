import fs from "fs/promises";
import readline from "readline/promises";
import { google, gmail_v1, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";

import dotenv from "dotenv";
dotenv.config();

export const GMAIL_ADDRESS = process.env.GMAIL_ADDRESS;

const SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar.events",
];
const TOKEN_PATH = "token.json";
const CREDENTIALS_PATH = "credentials.json";

type Credentials = {
    installed: {
        client_id: string;
        client_secret: string;
        redirect_uris: string[];
    };
};

const loadCredentials = async (): Promise<Credentials["installed"]> => {
    const content = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    return JSON.parse(content).web;
};

const saveToken = async (token: any): Promise<void> => {
    await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
};

const getOAuthClient = async (): Promise<OAuth2Client> => {
    const { client_id, client_secret, redirect_uris } = await loadCredentials();
    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    try {
        const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
        oAuth2Client.setCredentials(token);
    } catch {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
        });
        console.log("Authorize this app by visiting:", authUrl);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const code = await rl.question("Enter the code: ");
        rl.close();

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        await saveToken(tokens);
    }

    return oAuth2Client;
};

export const listUnreadMessages = async () => {
    const auth = await getOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    // const {
    //     data: { messages = [] },
    // } =
    const messages = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
        q: "is:unread",
    });

    const unreadMessages = [];

    for (const { id } of messages.data.messages!) {
        if (!id) continue; // skip if id is null or undefined

        const message = await gmail.users.messages.get({ userId: "me", id });

        // const isUnread = message.data.labelIds?.includes("UNREAD");
        // if (isUnread) {
        const subjectHeader = message.data.payload?.headers?.find(
            (h) => h.name === "Subject"
        );
        console.log("Subject:", subjectHeader?.value || "(no subject)");
        unreadMessages.push(message);
        // }
    }

    return unreadMessages;

    // messages.data.nextPageToken
};

export const getPlainTextFromThread = (thread: any) => {
    const messages = thread.data.messages;
    const texts = [];

    for (const msg of messages) {
        const headers = msg.payload.headers;
        const from =
            headers.find((h: any) => h.name.toLowerCase() === "from")?.value ||
            "Unknown Sender";
        const date =
            headers.find((h: any) => h.name.toLowerCase() === "date")?.value ||
            "Unknown Date";

        const parts = msg.payload.parts || [msg.payload];
        for (const part of parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
                const decoded = Buffer.from(part.body.data, "base64")
                    .toString("utf-8")
                    .trim();
                texts.push(`---\nFrom: ${from}\nDate: ${date}\n\n${decoded}`);
            }
        }
    }

    return texts.join("\n\n");
};

export const getReplyAddresses = (message: any) => {
    const headers = message.payload.headers;
    const from = headers.find(
        (h: any) => h.name.toLowerCase() === "from"
    )?.value;
    const replyTo = headers.find(
        (h: any) => h.name.toLowerCase() === "reply-to"
    )?.value;

    // Prefer Reply-To if available, fallback to From
    return replyTo || from;
};

export const getAllReplyAddresses = (thread: any) => {
    const addresses = new Set();

    for (const msg of thread.data.messages) {
        const addr = getReplyAddresses(msg);
        if (addr) addresses.add(addr);
    }

    return Array.from(addresses);
};

export const getLastMessageId = (thread: any) => {
    const messages = thread.data.messages;
    const lastMessage = messages[messages.length - 1];
    return lastMessage.payload.headers.find(
        (h: any) => h.name.toLowerCase() === "message-id"
    )?.value;
};

export const getSubject = (thread: any) => {
    const firstMessage = thread.data.messages[0];
    const subjectHeader = firstMessage.payload.headers.find(
        (h: any) => h.name.toLowerCase() === "subject"
    );
    return subjectHeader?.value || "";
};

export const getNextUnreadMessageThread = async () => {
    try {
        const auth = await getOAuthClient();
        const gmail = google.gmail({ version: "v1", auth });

        const messages = await gmail.users.messages.list({
            userId: "me",
            maxResults: 1,
            q: "is:unread",
        });

        let thread = null;

        if (messages.data.messages) {
            for (const { id, threadId } of messages.data.messages) {
                if (!id || !threadId) continue; // skip if id is null or undefined

                thread = await gmail.users.threads.get({
                    userId: "me",
                    id: threadId,
                });
            }
        }

        return {
            thread,
            nextPageToken: messages.data.nextPageToken,
        };
    } catch (e) {
        console.log("error getting next unread message: " + e);
        throw "error getting next unread message";
    }
};

export const getMessageThread = async (threadId: string) => {
    const auth = await getOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    return await gmail.users.threads.get({ userId: "me", id: threadId });
};

export const markMessageAsRead = async (id: string) => {
    const auth = await getOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    await gmail.users.messages.modify({
        userId: "me",
        id,
        requestBody: {
            removeLabelIds: ["UNREAD"],
        },
    });
};

export const sendEmail = async (to: string, subject: string, body: string) => {
    const auth = await getOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    const rawMessage = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
    ].join("\n");

    const encodedMessage = Buffer.from(rawMessage)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    await gmail.users.messages.send({
        userId: "me",
        requestBody: {
            raw: encodedMessage,
        },
    });

    return "success";
};

export const sendEmailReply = async (
    to: string,
    subject: string,
    body: string,
    lastMessageId: string,
    threadId: string
) => {
    const auth = await getOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    const rawMessage = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `In-Reply-To: ${lastMessageId}`,
        `References: ${lastMessageId}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
    ].join("\n");

    const encodedMessage = Buffer.from(rawMessage)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    await gmail.users.messages.send({
        userId: "me",
        requestBody: {
            raw: encodedMessage,
            threadId,
        },
    });

    return "success";
};

export const listCalendarEvents = async () => {
    const auth = await getOAuthClient();

    const calendar = google.calendar({ version: "v3", auth });

    // List events
    const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
    });

    console.log(res.data.items);

    return res.data.items;
};

//chat-gpt generated
export function isValidRFC3339WithTimezone(s: string): boolean {
    const rfc3339Regex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?([+-]\d{2}:\d{2}|Z)$/;
    return rfc3339Regex.test(s);
}

export const createCalendarEvent = async (
    title: string,
    location: string,
    description: string,
    startTime: string,
    endTime: string,
    attendees: string[],
    includeMeetLink: boolean
) => {
    const auth = await getOAuthClient();

    const calendar = google.calendar({ version: "v3", auth });

    const event: calendar_v3.Schema$Event = {
        summary: title,
        location: location,
        description: description,
        start: {
            dateTime: startTime, //(formatted according to RFC3339)
            timeZone: "America/Vancouver",
        },
        end: {
            dateTime: endTime,
            timeZone: "America/Vancouver",
        },
        attendees: attendees.map((attendee) => ({ email: attendee })),
    };

    let requestBody = {};
    if (includeMeetLink) {
        requestBody = {
            ...event,
            conferenceData: {
                createRequest: {
                    requestId: randomUUID(), // must be unique for each request
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                },
            },
        };
    } else {
        requestBody = event;
    }

    const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody,
        sendUpdates: "all",
        conferenceDataVersion: 1,
    });

    console.log(res.data.htmlLink);

    return res.data.htmlLink;
};
