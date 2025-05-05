//monitor for incoming emails

//read incoming emails and determine if they are a lead

//draft a reply

//send incoming email and draft reply by sms (or slack etc.) to user (me) for approval

//if approved reply to lead

//gmail reader from chatgpt

//personal gmail cannot use the api so there will have to be a step where we manually log in

import { ResponseInput } from "openai/resources/responses/responses";
import { AgentService } from "../agent";

//@ts-ignore
import cron from "node-cron";
import {
    createCalendarEvent,
    getAllReplyAddresses,
    getLastMessageId,
    getNextUnreadMessageThread,
    getPlainTextFromThread,
    getSubject,
    GMAIL_ADDRESS,
    listCalendarEvents,
    listUnreadMessages,
    markMessageAsRead,
    sendEmail,
    sendEmailReply,
} from "../../service/googleService";
import {
    createMessage,
    getAllUnrepliedMessages,
    markMessageReplied,
} from "../../database/dataAccess/emailReplyBotConnector";

//todo: move tool definitions to an object, then they can be inported and regiested for each tool
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

    agent.addFunctionTool({
        type: "function",
        name: "saveMessageToDb",
        description: "saves an email message to the database",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                threadText: {
                    type: "string",
                    description:
                        "the text content of the email message or email message thread",
                },
                subject: {
                    type: "string",
                    description:
                        "The subject line of an email is a brief summary or title that tells the recipient what the email is about. It should be clear, concise, and relevant to the content of the message to encourage the recipient to open it.",
                },
                replyAddress: {
                    type: "string",
                    description:
                        "the email address or strigified list of email addresses that a reply can be sent to",
                },
                lastMessageId: {
                    type: "string",
                    description: "the id of the last message in the thread",
                },
                threadId: {
                    type: "string",
                    description: "the id of the email message thread",
                },
                messageType: {
                    type: "string",
                    enum: ["lead", "scheduleRequest", "other"],
                    description:
                        "how this message should be classified in our internal system.",
                },
            },
            required: [
                "threadText",
                "subject",
                "replyAddress",
                "lastMessageId",
                "threadId",
                "messageType",
            ],
            additionalProperties: false,
        },
        functionToCall: async (
            threadText: string,
            subject: string,
            replyAddress: string,
            lastMessageId: string,
            threadId: string,
            messageType: string
        ) => {
            const message = {
                thread_text:
                    threadText.length < 5000
                        ? threadText
                        : threadText.substring(5000),
                is_thread_text_truncated:
                    threadText.length < 5000 ? false : true,
                reply_address: replyAddress,
                last_message_id: lastMessageId,
                thread_id: threadId,
                subject: subject,
                message_type: messageType,
                is_replied_to: false,
            };
            return await createMessage(message);
        },
    });
};

let isInboxBotLoopRunning = false;

const runInboxBot = async () => {
    if (isInboxBotLoopRunning) return;
    try {
        isInboxBotLoopRunning = true;
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
                "this is a thread of emails or a single email determine if the last message in the thread needs to be replied to (not a marketing or account email) then if it does save the message to our database. You will need to determine if the message is a lead, scheduleRequest or other messageType. Leads are any message asking about our services, if someone is reaching out for the first time asking to schedual a meeting it is a leed, scheduleRequests are messages that confirm a specific meeting time or wish to adjust the time of an already schedualed meeting, other is for messages that don't fit either but you still think we should reply to. Accepted calendar invites do not need responding to." +
                    JSON.stringify(content),
                `you are an agent that manages incoming emails for ${GMAIL_ADDRESS}, your job is to sort out valid emails that require a response (so exclude marketing emails, chain emails, account emails or other types of no reply emails). Your must determine the type of incoming emails and save them to our database so that they can be replied to`
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
    } finally {
        isInboxBotLoopRunning = false;
    }
};

let isReplyBotLoopRunning = false;

const runReplyBot = async () => {
    if (isReplyBotLoopRunning) return;
    try {
        isReplyBotLoopRunning = true;
        const agent = new AgentService();

        registerReplyBotAgentTools(agent);

        const unrepliedMessages = await getAllUnrepliedMessages();

        const dateString = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const dateTime = new Date().toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZoneName: "short",
        });

        for (const message of unrepliedMessages) {
            if (message.message_type == "lead") {
                const res = await agent.runFunctionCallingAgent(
                    `This email message was catagorised as a lead, write a reply email thanking them for reaching out and offer to schedual a 15 minuite introductory meeting in the next available time slot at least one buisness day in the future (today is ${dateString}). Do not offer to schedual meetings on weekends or holidays. Only schedual meetings between 10am and 4pm and make sure you check the calendar for available times. Do not offer to book a meeting in a time slot that already has an event. Try to offer 2 available times to each lead. (EXAMPLE: "Are you available for an introductory call either wednesday at 2:15 or thursday at 10am?") You are not sending meeting invites at this time, that will be done later, only suggesting potential meeting times. ` +
                        JSON.stringify(message),
                    `you are an agent that replies to email messages for ${GMAIL_ADDRESS}, your main job is to reply to incoming leads and offer to schedual meetings with potential customers.  You only reply to valid emails that require a response not to marketing emails, chain emails, account emails or other types of non personal emails. Sign emails with MB.`
                );

                console.log(res);

                //TODO: eventually this will be done by the agent, will also need to add "escalation options" for the agent if it does not feel like it can offer a reply
                await markMessageReplied(message.id!);
            } else if (message.message_type == "scheduleRequest") {
                const res = await agent.runFunctionCallingAgent(
                    `This email message was catagorised as a schedule request, check that the date and time for the requested meeting is in the future (it is ${dateTime}). Make sure you check the calendar before scheduling a new meeting. Meetings can be schedualed between 10am and 4pm on buisness days. Do not double book events in a time slot. If a meeting time that a customer has requested is not available polietly offer 2 available times ie. "Unfortunatly that time is not avaialble would you be able to do either wednesday at 2:15 or thursday at 10am?" If you are scheduling a meeting make sure you send both the calendar invite and a confirmation email.` +
                        JSON.stringify(message),
                    `you are an agent that replies to email messages for ${GMAIL_ADDRESS}, your main job is to reply to schedualing requests and send meeting invites to potential customers.  You only reply to valid emails that require a response not to marketing emails, chain emails, account emails or other types of non personal emails. Sign emails with MB. All meetings should be scheduled in the Vancouver/America timezone (either PST OR PDT depending on the time of year). Double check that you are getting the date and times correct, there is no room for error here.`
                );

                console.log(res);

                await markMessageReplied(message.id!);
            } else {
                const res = await agent.runFunctionCallingAgent(
                    `This email message was catagorised as other but the inbox agent stil felt that it should be replied to (not a lead or scheduleRequest). Determine if this email does need a response and if it does write and send one. ` +
                        JSON.stringify(message),
                    `you are an agent that replies to email messages for ${GMAIL_ADDRESS}, your main job is to reply to leads and schedualing requests from potential customers.  You only reply to valid emails that require a response not to marketing emails, chain emails, account emails or other types of non personal emails. Sign emails with MB.`
                );

                console.log(res);

                await markMessageReplied(message.id!);
            }
        }
    } finally {
        isReplyBotLoopRunning = false;
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

        // const res = await agent.runFunctionCallingAgent(
        //     `it is currently April 26, 2025 can you schedual a call for next wednesday at 10:15 with`,
        //     `you are an agent that manages an email inbox for ${GMAIL_ADDRESS}, you only reply to valid emails that require a response not to marketing emails, chain emails, account emails or other types of non personal emails, sign emails with name. You also manage the calendar schedualing intro calls`
        // );

        // console.log(res);

        //TODO: need to add a human in the loop option for the reply bot
        //this would invole saving the reply in an unapproved state
        //need multiple flags "approved", "sentForApproval"
        //run a loop that gets all replies that are both unapproved an not sentForApproval then send them to me via text or email (or any interface really)

        //3 loops?
        // read incoming emails, create replies for those it thinks needs them and save those replies and incoming to db - maybe initial reply does not need approval but confirming a schedualed meeting does
        // send incoming to approver
        // reply to approved

        //will need to catagorise incoming emails as leads or schedualing or other
        // await runInboxBotloop(agent);
    } finally {
        isRunning = false;
    }

    return "all emails replied to";
};

//TODO: thinking about adding a "verifier" to the Agent service,
//the verifier if enabled would check the function calling llm responses before the function is called to make sure that the function is being used correctly

export const scheduleBots = () => {
    console.log("scheduling bots");
    cron.schedule("*/2 * * * *", async () => {
        console.log("running reply inbox bot");
        await runInboxBot();
        console.log("running reply bot");
        await runReplyBot();
    });

    //TODO: having two seperate crons doens't work... for javascript reasons?
    // cron.schedule("*/2 * * * *", async () => {
    //     await runInboxBot();
    // });
};
