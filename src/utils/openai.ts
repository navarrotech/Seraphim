// Copyright © 2025 Jalapeno Labs

// Misc
import { OpenAI } from 'openai'
import { OPENAI_API_TOKEN } from '../env'

export const openai = new OpenAI({
  apiKey: OPENAI_API_TOKEN
})
