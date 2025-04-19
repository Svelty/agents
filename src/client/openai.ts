import OpenAI from "openai";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Initialize the OpenAI client with the API key from the .env file
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const createModelResponseRequest = async (
    request: ResponseCreateParamsNonStreaming
) => {
    const response = await client.responses.create(request);
    return response;
};

// {
//   id: 'resp_67f5bdad13548192842348ab8be2c94f09c1cb161e1b134a',
//   object: 'response',
//   created_at: 1744158125,
//   status: 'completed',
//   error: null,
//   incomplete_details: null,
//   instructions: null,
//   max_output_tokens: null,
//   model: 'gpt-4o-mini-2024-07-18',
//   output: [
//     {
//       type: 'function_call',
//       id: 'fc_67f5bdadbb908192a6c6128e7e665dd509c1cb161e1b134a',
//       call_id: 'call_5giFnoKDy2LnZxsAnC746Gk9',
//       name: 'test_tool',
//       arguments: '{"aNumber":33,"aString":"I feel curious today."}',
//       status: 'completed'
//     },
//     {
//       type: 'function_call',
//       id: 'fc_67f5bdae09748192bd8909f04c8360c509c1cb161e1b134a',
//       call_id: 'call_Q9cpkVbIXdCqvJhG5YA0oJik',
//       name: 'test_tool',
//       arguments: '{"aNumber":47,"aString":"I feel determined."}',
//       status: 'completed'
//     }
//   ],
//   parallel_tool_calls: true,
//   previous_response_id: null,
//   reasoning: { effort: null, generate_summary: null },
//   store: true,
//   temperature: 1,
//   text: { format: { type: 'text' } },
//   tool_choice: 'auto',
//   tools: [
//     {
//       type: 'function',
//       description: 'This is a test, this is only a test.',
//       name: 'test_tool',
//       parameters: [Object],
//       strict: true
//     }
//   ],
//   top_p: 1,
//   truncation: 'disabled',
//   usage: {
//     input_tokens: 0,
//     input_tokens_details: { cached_tokens: 0 },
//     output_tokens: 0,
//     output_tokens_details: { reasoning_tokens: 0 },
//     total_tokens: 0
//   },
//   user: null,
//   metadata: {},
//   output_text: ''
// }
