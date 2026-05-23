import { generateObject, generateText, type LanguageModel } from 'ai'
import type { z } from 'zod'
import { extractJsonPayload, repairStructuredOutputText } from './repairStructuredOutputText'

export async function generateStructuredObject<TSchema extends z.ZodTypeAny>(
  args: {
    model: LanguageModel
    schema: TSchema
    system: string
    prompt: string
    schemaName?: string
    schemaDescription?: string
    temperature?: number
    maxOutputTokens?: number
  },
): Promise<z.infer<TSchema>> {
  const temperature = args.temperature ?? 0.3
  const maxOutputTokens = args.maxOutputTokens ?? 8192

  try {
    const result = await generateObject({
      model: args.model,
      schema: args.schema,
      schemaName: args.schemaName,
      schemaDescription: args.schemaDescription,
      system: args.system,
      prompt: args.prompt,
      temperature,
      maxOutputTokens,
      experimental_repairText: repairStructuredOutputText,
    })
    const validated = args.schema.safeParse(result.object)
    if (validated.success) {
      return validated.data
    }
  } catch {
    // Some providers/models fail JSON-schema mode; fall back to plain text + parse.
  }

  const { text } = await generateText({
    model: args.model,
    system: [
      args.system,
      'Respond with ONLY a single JSON object that matches the required schema.',
      'Do not use markdown code fences or add commentary.',
    ].join('\n\n'),
    prompt: args.prompt,
    temperature,
    maxOutputTokens,
  })

  const jsonPayload = extractJsonPayload(text) ?? text.trim()
  if (!jsonPayload) {
    throw new Error('The model returned an empty response.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonPayload)
  } catch {
    throw new Error('The model response was not valid JSON.')
  }

  const validated = args.schema.safeParse(parsed)
  if (!validated.success) {
    throw new Error('The model response did not match the expected structure.')
  }

  return validated.data
}
