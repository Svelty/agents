import {
    FunctionTool,
    ResponseCreateParamsNonStreaming,
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
        request: ResponseCreateParamsNonStreaming,
        functionResultsRequest: ResponseCreateParamsNonStreaming
    ) {
        const response = await createModelResponseRequest(request);
        const modelOutput = response.output;

        const functionCallResults: Map<string, any> = new Map();
        //TODO:do we need to do something to handle async vs sync functions
        for (const action of modelOutput) {
            //@ts-ignore
            const tool = this.getTool(action.name);

            if (tool) {
                //@ts-ignore
                const params = Object.keys(tool.parameters.properties);

                //@ts-ignore
                const args: any[] = [];
                //@ts-ignore
                const actionArgs = JSON.parse(action.arguments);

                for (const param of params) {
                    //@ts-ignore
                    args.push(actionArgs[param]);
                }

                const res = await tool.functionToCall(...args);
                //@ts-ignore
                functionCallResults.set(action.id + ":" + action.name, res);
            }
        }

        //TODO:do we need an intermidary step here where we can optionally process the results before sending back to gpt

        functionResultsRequest.input =
            "function call results: " + JSON.stringify(functionCallResults);

        const finalResponse = await createModelResponseRequest(
            functionResultsRequest
        );

        return finalResponse;
    }
}
