import {
    FunctionTool,
    ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import { createModelResponseRequest } from "../client/openai";

export const expandPrompt = () => {};

interface CustomFunctionTool extends FunctionTool {
    functionToCall: (...args: any[]) => any;
}

// {
//         type: "function",
//         name: "getChallengerSummonersForSoloQ",
//         description:
//         "Get a list of summoners in challenger league for league of legends solo queue",
//         // parameters: {
//         //   type: "object",
//         //   additionalProperties: false,
//         // },
//         strict: false,

//         // parameters: {
//         //   type: "object",
//         //   properties: {
//         //     aNumber: {
//         //       type: "number",
//         //       description: "Choose a number between 1 and 59",
//         //     },
//         //     aString: {
//         //       type: "string",
//         //       description: "A single sentence describing your mood",
//         //     },
//         //   },
//         //   required: ["aNumber", "aString"],
//         //   additionalProperties: false,
//         // },
//         functionToCall: () =>
//         LeagueApi.getChallengerSummonersByQueue("RANKED_SOLO_5x5"),
//     }

export class AgentService {
    #functionTools: Map<string, CustomFunctionTool> = new Map();

    addFunctionTool(functionTool: CustomFunctionTool) {
        this.#functionTools.set(functionTool.name, functionTool);
        return functionTool;
    }

    getFunctionToolDefinition(name: string) {
        const func = this.#functionTools.get(name);
        if (!func) {
            return undefined;
        }

        const { functionToCall, ...rest } = func;
        return rest;
    }

    getFunctionToCall(name: string) {
        const func = this.#functionTools.get(name);
        if (!func) {
            return undefined;
        }

        const { functionToCall } = func;
        return functionToCall;
    }

    async runFunctionCallingAgent(request: ResponseCreateParamsNonStreaming) {
        const response = await createModelResponseRequest(request);

        const functionCalls = response.output;

        const functionCallResults: Map<string, any> = new Map();
        //TODO: probably need to do something to handle async vs sync functions
        //TODO: need to handle params
        for (const functionCall of functionCalls) {
            //@ts-ignore
            const func = getFunctionToCall(functionCall.name);
            if (func) {
                const res = await func();
                //@ts-ignore
                functionCallResults.set(functionCall.name, res);
            }
        }

        return functionCallResults;
    }
}
