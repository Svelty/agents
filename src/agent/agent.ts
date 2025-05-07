import {
    FunctionTool,
    ResponseCreateParamsNonStreaming,
    ResponseInput,
} from "openai/resources/responses/responses";
import { createModelResponseRequest } from "../client/openai";

export const expandPrompt = () => {};

interface CustomFunctionTool extends FunctionTool {
    functionToCall: (...args: any[]) => any;
}

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

    getTool(name: string) {
        const tool = this.#functionTools.get(name);
        if (!tool) {
            return undefined;
        }

        return tool;
    }

    async runFunctionCallingAgent(
        prompt: string | ResponseInput,
        initalInstructions: string
    ) {
        let input: any[] = [];
        if (typeof prompt == "string") {
            input.push({ role: "user", content: prompt });
        } else {
            input = [...prompt];
        }

        const tools = Array.from(this.#functionTools.values()).map((func) => {
            const { functionToCall, ...rest } = func;
            return rest;
        });

        const request = {
            model: "gpt-4.1", //"o4-mini",   //"gpt-4o" $2.50, o4-mini $1.10, gpt-4.1 $2.00
            input,
            instructions: initalInstructions,
            previous_response_id: null,
            store: false, //Whether to store the generated model response for later retrieval via API. boolean | null;
            user: "me", //unique id that can identify end user
            //@ts-ignore
            tools,
        };

        const response = await createModelResponseRequest(request);

        let previousResponseId = response.id;
        let modelOutput = response.output;
        let hasFunctionCall = modelOutput.some(
            (obj) => obj.type === "function_call"
        );

        let followUpResponse;

        let circutBreaker = 0;
        while (hasFunctionCall) {
            for (const action of modelOutput) {
                if (action.type == "function_call") {
                    //@ts-ignore
                    const tool = this.getTool(action.name);

                    if (tool) {
                        //@ts-ignore
                        const params = tool?.parameters?.properties
                            ? Object.keys(tool.parameters.properties)
                            : [];

                        //@ts-ignore
                        const args: any[] = [];
                        //@ts-ignore
                        const actionArgs = JSON.parse(action.arguments);

                        for (const param of params) {
                            //@ts-ignore
                            args.push(actionArgs[param]);
                        }

                        const res = await tool.functionToCall(...args);

                        input.push(action);
                        input.push({
                            // append result message
                            type: "function_call_output",
                            call_id: action.call_id,
                            output: JSON.stringify(res),
                        });
                    }
                }
            }

            const functionResultsRequest = {
                model: "gpt-4o-mini", // $.25  //"gpt-4o" $2.50, o3-mini $1.10 -- dont use o3 use o1
                input,
                instructions: initalInstructions,
                // previous_response_id: previousResponseId,
                store: false, //Whether to store the generated model response for later retrieval via API. boolean | null;
                user: "me", //unique id that can identify end user
                tools,
            };

            console.log(`agent is on iteration ${circutBreaker} `);

            followUpResponse = await createModelResponseRequest(
                functionResultsRequest
            );

            modelOutput = followUpResponse.output;
            hasFunctionCall = modelOutput.some(
                (obj) => obj.type === "function_call"
            );

            circutBreaker++;
            if (circutBreaker > 20) {
                break;
            }
        }

        //TODO: do i want to be saving the whole conversation including all the function calls or do i just want the final result?
        const conversation = [...input, ...modelOutput];

        //TODO:do we need an intermidary step here where we can optionally process the results before sending back to gpt

        return conversation;
    }
}
