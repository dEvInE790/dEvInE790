// Claude (Anthropic Messages API) for the AI Learning Assistant, server-side only.
// ANTHROPIC_API_KEY is a Supabase secret; AI_MODEL optionally overrides the model.
import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0'
import type { AiApi } from './ai.ts'

export const DEFAULT_MODEL = 'claude-opus-5-5'

export function anthropicApi(apiKey: string, model = DEFAULT_MODEL): AiApi {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 110_000 })
  return {
    async ask({ system, messages }) {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        system,
        messages,
        output_config: { effort: 'medium' },
        // If a safety classifier declines, Anthropic retries on its recommended model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      })
      let text = ''
      if (response.stop_reason !== 'refusal') {
        for (const block of response.content) {
          if (block.type === 'text') text += block.text
        }
      }
      return {
        text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        stopReason: response.stop_reason,
      }
    },
  }
}
