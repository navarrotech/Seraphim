// Copyright © 2025 Jalapeno Labs

// TODO: This is getting us closer to what we need... But still not all the way there.
// import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
// import { ChatOpenAI } from '@langchain/openai'
// import { loadCache, saveCache } from './utility/promptCache'

// export class FileCacheChatOpenAI extends ChatOpenAI {
//   // Override the low-level .call() (used by LangChain under the hood)
//   async call({ messages }: { messages: ChatCompletionMessageParam[] }): Promise<any> {
//     // 1. Try to load from disk
//     const cached = await loadCache(messages)
//     if (cached) {
//       // we stored the *body* of the response as a JSON string
//       return JSON.parse(cached)
//     }

//     // 2. Miss → actually call the API
//     const result = await super.call({ messages })

//     // 3. Save the entire result object back to disk
//     await saveCache(messages, JSON.stringify(result))

//     return result
//   }
// }
