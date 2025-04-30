//monitor for incoming emails

//read incoming emails and determine if they are a lead

//draft a reply

//send incoming email and draft reply by sms (or slack etc.) to user (me) for approval

//if approved reply to lead

//gmail reader from chatgpt

//personal gmail cannot use the api so there will have to be a step where we manually log in

import fs from "fs/promises";
import readline from "readline/promises";
import { google, gmail_v1, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { ResponseInput } from "openai/resources/responses/responses";
import { AgentService } from "../agent";
import dotenv from "dotenv";

//@ts-ignore
import cron from "node-cron";
import { randomUUID } from "crypto";

dotenv.config();

const GMAIL_ADDRESS = process.env.GMAIL_ADDRESS;

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

const getPlainTextFromThread = (thread: any) => {
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

const getReplyAddresses = (message: any) => {
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

const getAllReplyAddresses = (thread: any) => {
    const addresses = new Set();

    for (const msg of thread.data.messages) {
        const addr = getReplyAddresses(msg);
        if (addr) addresses.add(addr);
    }

    return Array.from(addresses);
};

const getLastMessageId = (thread: any) => {
    const messages = thread.data.messages;
    const lastMessage = messages[messages.length - 1];
    return lastMessage.payload.headers.find(
        (h: any) => h.name.toLowerCase() === "message-id"
    )?.value;
};

const getSubject = (thread: any) => {
    const firstMessage = thread.data.messages[0];
    const subjectHeader = firstMessage.payload.headers.find(
        (h: any) => h.name.toLowerCase() === "subject"
    );
    return subjectHeader?.value || "";
};

export const getNextUnreadMessageThread = async () => {
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
};

export const getMessageThread = async (threadId: string) => {
    const auth = await getOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    return await gmail.users.threads.get({ userId: "me", id: threadId });
};

const markMessageAsRead = async (id: string) => {
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

const listCalendarEvents = async () => {
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
function isValidRFC3339WithTimezone(s: string): boolean {
    const rfc3339Regex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?([+-]\d{2}:\d{2}|Z)$/;
    return rfc3339Regex.test(s);
}

const createCalendarEvent = async (
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

const registerReplyBotAgentTools = (agent: AgentService) => {
    //@ts-ignore
    agent.addFunctionTool({
        type: "function",
        name: "getUnreadEmails",
        description: "gets a list of unread emails",
        strict: false,
        functionToCall: listUnreadMessages,
    });

    agent.addFunctionTool({
        type: "function",
        name: "sendEmail",
        description: "sends a message to an email address",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                to: {
                    type: "string",
                    description:
                        "a valid email address that the message will be sent to",
                },
                subject: {
                    type: "string",
                    description:
                        "The subject line of an email is a brief summary or title that tells the recipient what the email is about. It should be clear, concise, and relevant to the content of the message to encourage the recipient to open it.",
                },
                body: {
                    type: "string",
                    description: "the content of the message",
                },
            },
            required: ["to", "subject", "body"],
            additionalProperties: false,
        },
        functionToCall: sendEmail,
    });

    agent.addFunctionTool({
        type: "function",
        name: "sendEmailReply",
        description: "sends a message to an email address in reply to a thread",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                to: {
                    type: "string",
                    description:
                        "a valid email address that the message will be sent to",
                },
                subject: {
                    type: "string",
                    description:
                        "The subject line of an email is a brief summary or title that tells the recipient what the email is about. It should be clear, concise, and relevant to the content of the message to encourage the recipient to open it.",
                },
                body: {
                    type: "string",
                    description: "the content of the message",
                },
                lastMessageId: {
                    type: "string",
                    description: "the id of the last message in the thread",
                },
                threadId: {
                    type: "string",
                    description: "the id of the thread",
                },
            },
            required: ["to", "subject", "body", "lastMessageId", "threadId"],
            additionalProperties: false,
        },
        functionToCall: sendEmailReply,
    });

    //@ts-ignore
    agent.addFunctionTool({
        type: "function",
        name: "getCalendarEvents",
        description: "gets a list of calendar events",
        strict: false,
        functionToCall: listCalendarEvents,
    });

    agent.addFunctionTool({
        type: "function",
        name: "scheduleCalendarEvent",
        description:
            "schedule a calendar event with a start and end time and attendees, optionally include a video meet link",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "the title of the event",
                },
                location: {
                    type: "string",
                    description:
                        "the location of the event, if the event is virtual, ie if a video meet link is included set the location to video meet",
                },
                description: {
                    type: "string",
                    description: "a description of the event or a short agenda",
                },
                startTime: {
                    type: "string",
                    description:
                        "the start time of the event must be a valid RFC3339 formatted date with the timezone for America/Vancouver",
                },
                endTime: {
                    type: "string",
                    description:
                        "the end time of the event must be a valid RFC3339 formatted date with the timezone for America/Vancouver",
                },
                attendees: {
                    type: "array",
                    description:
                        "an array of email addresses that invites will be sent to for the event",
                    items: {
                        type: "string",
                    },
                },
                includeMeetLink: {
                    type: "boolean",
                    description:
                        "set to true if the event will be a virtual meeting and a video meet link needs to be sent, otherwise set to false",
                },
            },
            required: [
                "title",
                "location",
                "description",
                "startTime",
                "endTime",
                "attendees",
                "includeMeetLink",
            ],
            additionalProperties: false,
        },
        functionToCall: createCalendarEvent,
    });
};

const runReplyBotLoop = async () => {
    const agent = new AgentService();

    registerReplyBotAgentTools(agent);

    let nextMessageThread = await getNextUnreadMessageThread();

    while (nextMessageThread.thread != null) {
        const content = {
            threadText: getPlainTextFromThread(nextMessageThread.thread),
            replyAddress: getAllReplyAddresses(nextMessageThread.thread),
            lastMessageId: getLastMessageId(nextMessageThread.thread),
            threadId: nextMessageThread.thread.data.id,
            subject: getSubject(nextMessageThread.thread),
        };

        //maybe the only job of the inital agent is to read emails then save them to the db as either "lead", "schedualing" or "other"
        const res = await agent.runFunctionCallingAgent(
            "this is a thread of emails or a single email determine if the last message in the thread needs to be replied to (not a marketing or account email) then if it is write a response and reply to the email. If it is a customer interested in our services check the calendar and offer to set up a 15 minute meeting on the next day with an available timeslot" +
                JSON.stringify(content),
            `you are an agent that manages an email inbox for ${GMAIL_ADDRESS}, you only reply to valid emails that require a response not to marketing emails, chain emails, account emails or other types of no reply emails. Your main job is to reply to potential leads that are interested in our services and attempt to schedual a call with them, be polite but breif. Only answer questions if you know the answer.  sign emails with MB`
        );

        console.log(res);

        //todo: check for success
        if (
            res &&
            nextMessageThread.thread?.data?.messages &&
            nextMessageThread.thread?.data?.messages.length
        ) {
            for (const message of nextMessageThread.thread?.data?.messages)
                if (message.labelIds?.includes("UNREAD")) {
                    await markMessageAsRead(message.id!);
                }
        }

        nextMessageThread = await getNextUnreadMessageThread();
    }
};

const agentSessions: Map<string, ResponseInput> = new Map();

let isRunning = false;

export const runEmailBot = async (prompt: string, agentSessionId: string) => {
    if (isRunning) return;
    try {
        isRunning = true; //TODO: this needs try/finnaly logic

        let input: ResponseInput = [];

        if (agentSessions.has(agentSessionId)) {
            input = [...agentSessions.get(agentSessionId)!];
        }
        input.push({ role: "user", content: prompt });

        const agent = new AgentService();

        registerReplyBotAgentTools(agent);

        const res = await agent.runFunctionCallingAgent(
            `it is currently April 26, 2025 can you schedual a call for next wednesday at 10:15 with`,
            `you are an agent that manages an email inbox for ${GMAIL_ADDRESS}, you only reply to valid emails that require a response not to marketing emails, chain emails, account emails or other types of non personal emails, sign emails with name. You also manage the calendar schedualing intro calls`
        );

        console.log(res);

        //TODO: need to add a human in the loop option for the reply bot
        //this would invole saving the reply in an unapproved state
        //need multiple flags "approved", "sentForApproval"
        //run a loop that gets all replies that are both unapproved an not sentForApproval then send them to me via text or email (or any interface really)

        //3 loops?
        // read incoming emails, create replies for those it thinks needs them and save those replies and incoming to db - maybe initial reply does not need approval but confirming a schedualed meeting does
        // send incoming to approver
        // reply to approved

        //will need to catagorise incoming emails as leads or schedualing or other
        // await runReplyBotLoop(agent);
    } finally {
        isRunning = false;
    }

    return "all emails replied to";
};

//TODO: thinking about adding a "verifier" to the Agent service,
//the verifier if enabled would check the function calling llm responses before the function is called to make sure that the function is being used correctly

cron.schedule("*/1 * * * *", () => {
    runReplyBotLoop();
});
