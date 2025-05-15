import * as chrono from "chrono-node";
import { DateTime } from "luxon";
import { AgentService } from "../agent";

export const extractAndNormaliseDates = async (text: string) => {
    const agent = new AgentService();

    agent.addFunctionTool({
        type: "function",
        name: "normalizeDatetimes",
        description:
            "Convert natural language datetime phrases into RFC3339 format (YYYY-MM-DDTHH:mm:ss±HH:MM) using a reference date.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                phrases: {
                    type: "array",
                    description:
                        "An array of natural language date/time phrases (e.g., 'this Thursday at 3pm') to normalize.",
                    items: {
                        type: "string",
                    },
                },
                referenceDate: {
                    type: "string",
                    description:
                        "An RFC3339-formatted date string (e.g., '2025-05-06T12:00:00-07:00') used to interpret relative phrases.",
                },
            },
            required: ["phrases", "referenceDate"],
            additionalProperties: false,
        },
        functionToCall: normalizeDatetimes,
    });

    agent.addFunctionTool({
        type: "function",
        name: "normalizeDates",
        description:
            "Convert natural language date phrases into ISO 8601 format (YYYY-MM-DD) using a reference date.",
        strict: true,
        parameters: {
            type: "object",
            properties: {
                phrases: {
                    type: "array",
                    description:
                        "An array of natural language date/time phrases (e.g., 'this Thursday') to normalize.",
                    items: {
                        type: "string",
                    },
                },
                referenceDate: {
                    type: "string",
                    description:
                        "A date only ISO 8601 formatted date string (e.g., '2025-05-06') used to interpret relative phrases.",
                },
            },
            required: ["phrases", "referenceDate"],
            additionalProperties: false,
        },
        functionToCall: normalizeDates,
    });

    const res = await agent.runFunctionCallingAgent(
        `You are a date and time normalization assistant.
        Your task is to detect and normalize all natural language date and time expressions in the following email. Replace each expression with a standardized RFC3339 format:
        - Use **YYYY-MM-DD** for date-only expressions (e.g., 'this Thursday').
        - Use **YYYY-MM-DDTHH:mm:ss±HH:MM** for date/time expressions (e.g., 'this Thursday at 3pm').

        Follow these instructions:
        1. Only modify date and time expressions.
        2. Do not modify any other content in the email.
        3. Do not add time to expressions that only refer to a date (e.g., 'this Thursday' should become '2025-05-08', **not** '2025-05-08 00:00').
        4. Do not normalize expressions that are only a time (e.g. '12:30' stays as '12:30')
        5. Do not change the timezones of times
        6. Assume the sender is in the same timezone as today’s date.
        7. Use the tools provided:
            - If the expression **includes a time** (e.g., 'at 3pm', '10:00 AM'), use the tool 'normalizeDatetimes' to get the correct datetime.
            - If the expression **only refers to a date** (e.g., 'this Thursday', 'Monday next week'), use the tool 'normalizeDates' to get the correct date.

        Return only the modified Email with the normalized date and time expressions. Return everything pased in as the Email field. Don't include the Today is. Do not include any extra text or explanations. Make sure to return the whole email message.

        Today is: ${new Date().toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZoneName: "short",
        })}

        EMAIL MESSAGE START
        ${text} 
        EMAIL MESSAGE END
        `,
        ""
    );

    console.log({
        textIn: text,
        textOut: res[res.length - 1].content[0].text,
    });

    return res[res.length - 1].content[0].text;
};

// If there are natural langue date and time expressings in this email thread extract them and replace them with normalised formatted ones. Do not include any extra text or explanations; only return the modified body of the email.

// You are an assistant that extracts natural language date and time expressions from an email

// ``

const normalizeDatetimes = (
    phrases: string[],
    referenceDate = new Date(),
    timeZone = "America/Vancouver"
) => {
    return phrases.map((phrase) => {
        const parsed = chrono.parse(phrase, referenceDate)[0];
        const date = parsed?.start?.date();
        return {
            phrase,
            normalized: date
                ? DateTime.fromJSDate(date, { zone: "utc" })
                      .setZone(timeZone)
                      .toISO()
                : null,
        };
    });
};

// const normalizeDatetimes = (phrases: string[], referenceDate = new Date()) => {
//     return phrases.map((phrase) => {
//         const parsed = chrono.parse(phrase, referenceDate)[0];
//         return {
//             phrase,
//             normalized: parsed?.start?.date().toISOString() || null,
//         };
//     });
// };

const normalizeDates = (datePhrases: string[], referenceDate = new Date()) => {
    return datePhrases.map((phrase) => {
        const result = chrono.parseDate(phrase, referenceDate);
        return { phrase, normalized: result?.toISOString() || null };
    });
};

// You are a date and time normalization assistant.
//         Your task is to detect and normalize all natural language date and time expressions in the following email. Replace each expression with a standardized ISO 8601 format (YYYY-MM-DD HH:mm) in the context of the current date and time. Use the tools provided, don't attempt to do the conversion yourself. Do not include any extra text or explanations; only return the modified body of the email.
//             - Only modify date and time expressions.
//             - Keep the rest of the email exactly as-is.
//             - Assume the sender is in the same timezone as today’s date.

//         For expressions that contain **time**, use the tool 'normalizeDatetimePhrases'.
//         For expressions that contain **only a date**, use the tool 'normalizeDates'.
