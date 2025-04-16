import { AgentService } from "../agent";

export const runSimpleAddingAgent = async () => {
    const agent = new AgentService();

    //@ts-ignore
    agent.addFunctionTool({
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

    const results = await agent.runFunctionCallingAgent(
        "Come up with two random numbers between 1 and 10, add them together using the add tool, use the results of the tool ouput to write a rhyme about the ocean with exactly that many lines",
        "You are an expert wordsmith and poet but you need help with math"
    );

    return results;
};
