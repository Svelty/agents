import fs from "fs/promises";
import readline from "readline/promises";
import { google, gmail_v1, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { randomUUID } from "crypto";

import dotenv from "dotenv";
import { DateTime, Interval } from "luxon";
dotenv.config();

export const GMAIL_ADDRESS = process.env.GMAIL_ADDRESS;

const SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
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

    //TODO: cache result so i don't have to read file every time
    return oAuth2Client;
};

//GMAIL
//gmail types
export type GoogleResponse<T> = {
    success: boolean;
    data: T;
};

export type MessageMetaData = {
    id: string;
    threadId: string;
};

//gmailId is used by gmail API, messageId is a email header used by all email clients
export type Message = {
    gmailId: string;
    subject: string;
    messageId: string;
    threadId: string;
    historyId: string;
    internalDate: string;
    labels: string[];
    from: string;
    to: string;
    text: string;
};

//gmail helper methods
const getPlainText = (
    payload: gmail_v1.Schema$MessagePart | undefined
): string | null => {
    if (!payload) return "";

    if (payload.mimeType === "text/plain" && payload.body?.data) {
        return Buffer.from(payload.body.data, "base64").toString("utf-8");
    }

    if (payload.parts) {
        for (const part of payload.parts) {
            const text = getPlainText(part);
            if (text) return text;
        }
    }

    return "";
};

const getReplyAddresses = (
    payload: gmail_v1.Schema$MessagePart | undefined
) => {
    if (!payload || !payload.headers) return "";

    const headers = payload.headers;
    const from = headers.find(
        (h: any) => h.name.toLowerCase() === "from"
    )?.value;
    const replyTo = headers.find(
        (h: any) => h.name.toLowerCase() === "reply-to"
    )?.value;

    // Prefer Reply-To if available, fallback to From
    return replyTo || from;
};

const getToAddresses = (payload: gmail_v1.Schema$MessagePart | undefined) => {
    if (!payload || !payload.headers) return "";

    const headers = payload.headers;
    return headers.find((h: any) => h.name.toLowerCase() === "to")?.value;
};

const getSubject = (payload: gmail_v1.Schema$MessagePart | undefined) => {
    if (!payload || !payload.headers) return "";
    const subjectHeader = payload.headers.find(
        (h: any) => h.name.toLowerCase() === "subject"
    );
    return subjectHeader?.value || "";
};

const getLastMessageId = (thread: gmail_v1.Schema$Thread) => {
    if (thread.messages?.length) {
        const messages = thread.messages;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.payload?.headers) {
            return lastMessage.payload.headers.find(
                (h: any) => h.name.toLowerCase() === "message-id"
            )?.value;
        }
    }
    return "";
};

const getMessageId = (payload: gmail_v1.Schema$MessagePart | undefined) => {
    if (!payload || !payload.headers) return "null";

    return (
        //@ts-ignore
        payload.headers.find((h) => h.name.toLowerCase() === "message-id")
            ?.value || ""
    );
};

//gmail methods
export const listMessageGmailIds = async (
    maxResults: number = 10,
    onlyUnread: boolean = true
): Promise<GoogleResponse<MessageMetaData[] | null>> => {
    try {
        const auth = await getOAuthClient();
        const gmail = google.gmail({ version: "v1", auth });

        const listRequest: gmail_v1.Params$Resource$Users$Messages$List = {
            userId: "me",
            maxResults: maxResults,
        };
        if (onlyUnread) {
            listRequest.q = "is:unread";
        }

        const res = await gmail.users.messages.list(listRequest);
        if (res.status != 200) {
            return { success: false, data: null };
        }

        //@ts-ignore
        return { success: true, data: res.data.messages! };
    } catch {
        return { success: false, data: null };
    }
};

// : Promise<GoogleResponse<Message>>
export const getMessageByGmailId = async (messageId: string) => {
    try {
        const auth = await getOAuthClient();
        const gmail = google.gmail({ version: "v1", auth });

        const res = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
        });
        if (res.status != 200) {
            return { success: false, data: null };
        }

        //TODO: what is the right way to handle the fact that all of these COULD be undefined?
        //can i just say that they
        const message: Message = {
            gmailId: res.data.id!,
            subject: getSubject(res.data.payload)!,
            messageId: getMessageId(res.data.payload),
            threadId: res.data.threadId!,
            historyId: res.data.historyId!,
            internalDate: res.data.internalDate!,
            labels: res.data.labelIds!,
            from: getReplyAddresses(res.data.payload) || "",
            to: getToAddresses(res.data.payload) || "",
            text: getPlainText(res.data.payload) || "",
        };

        return { success: true, data: message };
    } catch {
        return { success: false, data: null };
    }
};

export const getThreadById = async (threadId: string) => {
    try {
        const auth = await getOAuthClient();
        const gmail = google.gmail({ version: "v1", auth });

        const res = await gmail.users.threads.get({
            userId: "me",
            id: threadId,
            format: "full",
        });

        if (res.status != 200 || !res.data.messages) {
            return { success: false, data: null };
        }

        const messages: Message[] = [];

        for (const message of res.data.messages) {
            messages.push({
                gmailId: message.id!,
                subject: getSubject(message.payload)!,
                messageId: getMessageId(message.payload),
                threadId: message.threadId!,
                historyId: message.historyId!,
                internalDate: message.internalDate!,
                labels: message.labelIds!,
                from: getReplyAddresses(message.payload) || "",
                to: getToAddresses(message.payload) || "",
                text: getPlainText(message.payload) || "",
            });
        }

        return { success: true, data: messages };
    } catch {
        return { success: false, data: null };
    }
};

export const getNextUnreadMessage = async () => {
    try {
        const list = await listMessageGmailIds(1, true);

        if (list.success && list.data && list.data.length > 0) {
            return getMessageByGmailId(list.data[0].id);
        } else {
            return null;
        }
    } catch (e) {
        console.log("error getting next unread message: " + e);
        throw "error getting next unread message";
    }
};

export const getNextThreadWithUnreadMessage = async () => {
    try {
        const list = await listMessageGmailIds(1, true);

        if (list.success && list.data && list.data.length > 0) {
            return getThreadById(list.data[0].threadId);
        } else {
            return null;
        }
    } catch (e) {
        console.log("error getting next unread message: " + e);
        throw "error getting next unread message";
    }
};

export const markMessageAsRead = async (id: string) => {
    try {
        const auth = await getOAuthClient();
        const gmail = google.gmail({ version: "v1", auth });

        await gmail.users.messages.modify({
            userId: "me",
            id,
            requestBody: {
                removeLabelIds: ["UNREAD"],
            },
        });
    } catch (e) {
        console.log("error marking message as read: " + e);
        throw "error marking message as read";
    }
};

export const sendEmail = async (to: string, subject: string, body: string) => {
    try {
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

        return `Email ${subject} has been successfully sent to ${to}`;
    } catch (e) {
        console.log("Error sending email: " + e);
        throw "error sending email";
    }
};

export const sendEmailReply = async (
    to: string,
    subject: string,
    body: string,
    lastMessageId: string,
    threadId: string
) => {
    try {
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

        return `Email reply ${subject} has been successfully sent to ${to}`;
    } catch (e) {
        console.log("error sending reply email: " + e);
        throw "error sending reply email";
    }
};

//CALENDAR
//calendar helper methods
//chat-gpt generated
const isValidRFC3339WithTimezone = (s: string): boolean => {
    const rfc3339Regex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?([+-]\d{2}:\d{2}|Z)$/;
    return rfc3339Regex.test(s);
};

//calendar methods
// export const getAvailableTimes = async () => {
//     try {
//         const auth = await getOAuthClient();
//         const calendar = google.calendar({ version: "v3", auth });

//         const now = new Date();
//         const end = new Date(now.getTime() + 24 * 60 * 60 * 1000 * 7); // 1 week

//         const res = await calendar.freebusy.query({
//             requestBody: {
//                 timeMin: now.toISOString(),
//                 timeMax: end.toISOString(),
//                 items: [{ id: "primary" }],
//             },
//         });

//         const busy = res.data.calendars?.primary?.busy || [];

//         console.log("Busy times:", busy);

//         const free: { start: string; end: string }[] = [];
//         let lastEnd = now;

//         for (const block of busy) {
//             const busyStart = new Date(block.start!);
//             if (lastEnd < busyStart) {
//                 free.push({
//                     start: lastEnd.toISOString(),
//                     end: busyStart.toISOString(),
//                 });
//             }
//             lastEnd = new Date(
//                 Math.max(lastEnd.getTime(), new Date(block.end!).getTime())
//             );
//         }

//         if (lastEnd < end) {
//             free.push({
//                 start: lastEnd.toISOString(),
//                 end: end.toISOString(),
//             });
//         }

//         return free;
//     } catch (e) {
//         console.log("error getting available times: " + e);
//         throw "error getting available times";
//     }
// };

// const trimToWorkHours = (
//     start: DateTime,
//     end: DateTime
// ): { start: string; end: string }[] => {
//     const workDayStartHour = 10;
//     const workDayEndHour = 16;

//     const slots: { start: string; end: string }[] = [];

//     let cursor = start.startOf("day");

//     while (cursor < end) {
//         const workStart = cursor.set({ hour: workDayStartHour, minute: 0 });
//         const workEnd = cursor.set({ hour: workDayEndHour, minute: 0 });

//         const range = Interval.fromDateTimes(workStart, workEnd);
//         const overlap = range.intersection(Interval.fromDateTimes(start, end));
//         if (overlap && overlap.start && overlap.end) {
//             slots.push({
//                 start: overlap.start.toISO(),
//                 end: overlap.end.toISO(),
//             });
//         }

//         cursor = cursor.plus({ days: 1 });
//     }

//     return slots;
// };

const getHolidays = async (): Promise<Set<string>> => {
    const auth = await getOAuthClient();
    const calendar = google.calendar({ version: "v3", auth });

    const now = DateTime.now().setZone("America/Vancouver");
    const end = now.plus({ days: 30 });

    //TODO: this only works for fedral holidays, need a better method for provincial
    //todo: should also consider caching this
    const res = await calendar.events.list({
        calendarId: "en.canadian#holiday@group.v.calendar.google.com",
        timeMin: now.toISO()?.toString(),
        timeMax: end.toISO()?.toString(),
        singleEvents: true,
        orderBy: "startTime",
    });

    const holidays = new Set<string>();

    for (const event of res.data.items || []) {
        const dateStr = event.start?.date; // All-day events use `.date`
        if (dateStr) {
            holidays.add(dateStr); // format: 'YYYY-MM-DD'
        }
    }

    return holidays;
};

const isHoliday = (dt: DateTime, holidays: Set<string>): boolean => {
    return holidays.has(dt.toISODate()!); // compare by "YYYY-MM-DD"
};

const trimToWorkHours = async (
    start: DateTime,
    end: DateTime,
    holidays: Set<string> = new Set<string>()
): Promise<{ start: string; end: string }[]> => {
    const workDayStartHour = 10;
    const workDayEndHour = 16;
    const slots: { start: string; end: string }[] = [];

    let cursor = start.startOf("day");
    while (cursor < end) {
        const isWeekend = cursor.weekday === 6 || cursor.weekday === 7;
        if (!isWeekend && !isHoliday(cursor, holidays)) {
            const workStart = cursor.set({ hour: workDayStartHour });
            const workEnd = cursor.set({ hour: workDayEndHour });

            const range = Interval.fromDateTimes(workStart, workEnd);
            const overlap = range.intersection(
                Interval.fromDateTimes(start, end)
            );
            if (overlap && overlap.start && overlap.end) {
                slots.push({
                    start: overlap.start.toISO(),
                    end: overlap.end.toISO(),
                });
            }
        }

        cursor = cursor.plus({ days: 1 });
    }

    return slots;
};

export const getAvailableTimes = async () => {
    try {
        //TODO: holidays currently for all of canada
        const holidays = await getHolidays();

        const auth = await getOAuthClient();
        const calendar = google.calendar({ version: "v3", auth });

        const now = DateTime.now().setZone("America/Vancouver");
        const end = now.plus({ days: 14 }); //TOOD: this should be a param

        const res = await calendar.freebusy.query({
            requestBody: {
                timeMin: now.toUTC().toISO(),
                timeMax: end.toUTC().toISO(),
                items: [{ id: "primary" }],
            },
        });

        const busy = res.data.calendars?.primary?.busy || [];
        const free: { start: string; end: string }[] = [];

        let lastEnd = now;

        for (const block of busy) {
            const busyStart = DateTime.fromISO(block.start!, {
                zone: "utc",
            }).setZone("America/Vancouver");
            if (lastEnd < busyStart) {
                const slotStart = lastEnd;
                const slotEnd = busyStart;
                const slots = await trimToWorkHours(
                    slotStart,
                    slotEnd,
                    holidays
                );
                free.push(...slots);
            }
            const busyEnd = DateTime.fromISO(block.end!, {
                zone: "utc",
            }).setZone("America/Vancouver");
            lastEnd = busyEnd > lastEnd ? busyEnd : lastEnd;
        }

        if (lastEnd < end) {
            const slots = await trimToWorkHours(lastEnd, end, holidays);
            free.push(...slots);
        }

        return free.map(({ start, end }) => ({
            start: DateTime.fromISO(start, { zone: "America/Vancouver" })
                .toUTC()
                .toISO()!,
            end: DateTime.fromISO(end, { zone: "America/Vancouver" })
                .toUTC()
                .toISO()!,
        }));
    } catch (e) {
        console.log("error getting available times: " + e);
        throw "error getting available times";
    }
};

export const breakTimesIntoSlots = (
    available: { start: string; end: string }[],
    minutesPerSlot: number
): { start: string; end: string }[] => {
    const slots: { start: string; end: string }[] = [];

    for (const { start, end } of available) {
        let cursor = DateTime.fromISO(start, { zone: "utc" });
        const slotEnd = DateTime.fromISO(end, { zone: "utc" });

        while (cursor.plus({ minutes: minutesPerSlot }) <= slotEnd) {
            const next = cursor.plus({ minutes: minutesPerSlot });
            slots.push({
                start: cursor.toISO()!,
                end: next.toISO()!,
            });
            cursor = next;
        }
    }

    return slots;
};

export const listCalendarEvents = async () => {
    const auth = await getOAuthClient();

    const calendar = google.calendar({ version: "v3", auth });

    // List events
    const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 250,
        singleEvents: true,
        orderBy: "startTime",
    });

    console.log(res.data.items);

    const events = [];
    if (res.data.items) {
        for (const event of res.data.items) {
            events.push({
                id: event.id,
                summary: event.summary || "",
                description: event.description || "",
                location: event.location || "",
                start: event.start?.dateTime || event.start?.date || "",
                end: event.end?.dateTime || event.end?.date || "",
                created: event.created || "",
                updated: event.updated || "",
                status: event.status || "",
                htmlLink: event.htmlLink || "",
                organizer: event.organizer?.email || "",
                attendees: event.attendees?.map((a) => a.email) || [],
                attendeeStatus: event.attendees?.[0]?.responseStatus || null,
                recurringEventId: event.recurringEventId || null,
                recurring: !!event.recurringEventId,
                allDay: !!event.start?.date,
                iCalUID: event.iCalUID || "",
                conferenceLink:
                    event.conferenceData?.entryPoints?.find(
                        (e) => e.entryPointType === "video"
                    )?.uri ||
                    event.hangoutLink ||
                    null,
                eventType: event.eventType || "default",
            });
        }
    }

    return {
        nextPageToken: res.data.nextPageToken,
        events,
    };
};

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

    return {
        status: "success",
        link: res.data.htmlLink,
        description: `calendar event ${title} has been sucessuflly created`,
        id: res.data.id,
    };
};

export const updateCalendarEvent = async (
    eventId: string,
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
            dateTime: startTime,
            timeZone: "America/Vancouver",
        },
        end: {
            dateTime: endTime,
            timeZone: "America/Vancouver",
        },
        attendees: attendees.map((email) => ({ email })),
    };

    let requestBody = {};
    if (includeMeetLink) {
        requestBody = {
            ...event,
            conferenceData: {
                createRequest: {
                    requestId: randomUUID(),
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                },
            },
        };
    } else {
        requestBody = event;
    }

    const res = await calendar.events.update({
        calendarId: "primary",
        eventId,
        requestBody,
        sendUpdates: "all",
        conferenceDataVersion: 1,
    });

    console.log(res.data.htmlLink);

    return {
        status: "success",
        link: res.data.htmlLink,
        description: `calendar event ${title} has been sucessuflly updated`,
        id: res.data.id,
    };
};

//TODO: add an update calendar even function
