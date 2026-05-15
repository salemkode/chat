import { tool, type ToolExecutionOptions, type ToolSet } from 'ai'
import type { GenericActionCtx, GenericDataModel } from 'convex/server'
import type { z } from 'zod'

export type ToolCtx<DataModel extends GenericDataModel = GenericDataModel> =
  GenericActionCtx<DataModel> & {
    userId?: string
    threadId?: string
    messageId?: string
    promptMessageId?: string
  }

type ChatToolExecute<INPUT, OUTPUT, Ctx extends ToolCtx> = (
  ctx: Ctx,
  input: INPUT,
  options: ToolExecutionOptions,
) => AsyncIterable<OUTPUT> | PromiseLike<OUTPUT>

type ChatToolInputDefinition<INPUT, OUTPUT, Ctx extends ToolCtx> = {
  description?: string
  title?: string
  providerOptions?: Record<string, unknown>
  inputSchema: z.ZodType<INPUT>
  inputExamples?: Array<{
    input: INPUT
  }>
  needsApproval?: boolean
  strict?: boolean
  outputSchema?: z.ZodType<OUTPUT>
  execute: ChatToolExecute<INPUT, OUTPUT, Ctx>
}

type ChatToolDefinition<Ctx extends ToolCtx> = {
  description?: string
  title?: string
  providerOptions?: Record<string, unknown>
  inputSchema: z.ZodType
  inputExamples?: Array<{
    input: unknown
  }>
  needsApproval?: boolean
  strict?: boolean
  outputSchema?: z.ZodType
  execute: (
    ctx: Ctx,
    input: unknown,
    options: ToolExecutionOptions,
  ) => AsyncIterable<unknown> | PromiseLike<unknown>
}

export function createTool<INPUT, OUTPUT, Ctx extends ToolCtx = ToolCtx>(
  definition: ChatToolInputDefinition<INPUT, OUTPUT, Ctx>,
): ChatToolDefinition<Ctx> {
  return {
    description: definition.description,
    title: definition.title,
    providerOptions: definition.providerOptions,
    inputSchema: definition.inputSchema,
    inputExamples: definition.inputExamples,
    needsApproval: definition.needsApproval,
    strict: definition.strict,
    outputSchema: definition.outputSchema,
    execute: (ctx, input, options) =>
      definition.execute(ctx, definition.inputSchema.parse(input), options),
  }
}

export function bindChatTools<Ctx extends ToolCtx>(
  ctx: Ctx,
  toolSet: Record<string, ChatToolDefinition<Ctx>>,
): ToolSet {
  const output: ToolSet = {}

  for (const name in toolSet) {
    const definition = toolSet[name]
    if (!definition) {
      continue
    }

    output[name] = tool<unknown, unknown>({
      type: 'function',
      description: definition.description,
      inputSchema: definition.inputSchema,
      execute: (input: unknown, options: ToolExecutionOptions) =>
        definition.execute(ctx, input, options),
    })
  }

  return output
}
