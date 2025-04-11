import { AgentService } from "../agent";

export const runSimpleAddingAgent = async () => {
    const agent = new AgentService();

    //@ts-ignore
    const add = agent.addFunctionTool({
        type: "function",
        name: "add",
        description: "Adds two numbers together",
        strict: true,

        parameters: {
            type: "object",
            properties: {
                number1: {
                    type: "number",
                    description: "The first number to add",
                },
                number2: {
                    type: "number",
                    description: "the second number to add",
                },
            },
            required: ["number1", "number2"],
            additionalProperties: false,
        },
        functionToCall: (number1: number, number2: number) => number1 + number2,
    });

    const agentRequest = {
        model: "gpt-4o-mini", // $.25  //"gpt-4o" $2.50, o3-mini $1.10
        input: "Come up with two random numbers between 1 and 10, add them together using the add tool",
        instructions:
            "You are an expert wordsmith and poet but you need help with math",
        previous_response_id: null,
        store: false, //Whether to store the generated model response for later retrieval via API. boolean | null;
        user: "me", //unique id that can identify end user
        //@ts-ignore
        tools: [add],
    };

    const functionResultsRequest = {
        model: "gpt-4o-mini", // $.25  //"gpt-4o" $2.50, o3-mini $1.10 -- dont use o3 use o1
        input: "",
        instructions:
            "You are an expert wordsmith and poet, with the result returned to you write a rhyme about the ocean with exactly that many lines",
        // previous_response_id: firstRes.id,  -- i think i need to save response for this to work?
        store: false, //Whether to store the generated model response for later retrieval via API. boolean | null;
        user: "me", //unique id that can identify end user
    };

    const results = await agent.runFunctionCallingAgent(
        agentRequest,
        functionResultsRequest
    );

    return results;
};
