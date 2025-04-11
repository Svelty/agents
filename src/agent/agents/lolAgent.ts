import { createModelResponseRequest } from "../../client/openai";
import { LeagueApi } from "../../client/riot-league";
import { AgentService } from "../agent";

// RANKED_SOLO_5x5
export const runLolAgent = async () => {
    const agent = new AgentService();

    //@ts-ignore
    const getChallengerSummoners = agent.addFunctionTool({
        type: "function",
        name: "getChallengerSummonersForSoloQ",
        description:
            "Get a list of summoners in challenger league for league of legends solo queue",
        strict: false,
        functionToCall: () =>
            LeagueApi.getChallengerSummonersByQueue("RANKED_SOLO_5x5"),
    });

    //TODO: move as much of this as possible into the agentservice
    const agentRequest = {
        model: "gpt-4o-mini", // $.25  //"gpt-4o" $2.50, o3-mini $1.10
        input: "Get me a list of challenger summoner ids and and their league points, order them by league points",
        instructions: "You are a leage of legends analyist",
        previous_response_id: null,
        store: false, //Whether to store the generated model response for later retrieval via API. boolean | null;
        user: "me", //unique id that can identify end user
        //@ts-ignore
        tools: [getChallengerSummoners],
    };

    const functionResultsRequest = {
        model: "gpt-4o-mini", // $.25  //"gpt-4o" $2.50, o3-mini $1.10 -- dont use o3 use o1
        input: "",
        instructions: "You are a leage of legends analyist",
        // previous_response_id: firstRes.id,  -- i think i need to save response for this to work?
        store: false, //Whether to store the generated model response for later retrieval via API. boolean | null;
        user: "me", //unique id that can identify end user
    };

    //@ts-ignore
    const agentResults = agent.runFunctionCallingAgent(
        agentRequest,
        functionResultsRequest
    );

    return agentResults;
};
