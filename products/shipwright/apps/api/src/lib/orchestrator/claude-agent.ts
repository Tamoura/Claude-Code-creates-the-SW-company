import { generateText, streamText as aiStreamText } from 'ai';
import type {
  Agent,
  AgentRole,
  AgentContext,
  AgentResult,
  Task,
  StreamChunk,
  HandoffPayload,
} from './types';
import { getAgentPrompt } from './agent-prompts';

export class ClaudeAgent implements Agent {
  readonly role: AgentRole;

  constructor(role: AgentRole) {
    this.role = role;
  }

  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const systemPrompt = this.buildSystemPrompt(context);
    const messages = this.buildMessages(task, context);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000); // 5 min per agent

    try {
      const result = await generateText({
        model: this.getModel(context),
        system: systemPrompt,
        messages,
        abortSignal: controller.signal,
      });

      return {
        role: this.role,
        content: result.text,
        artifacts: [],
        tokensIn: result.usage?.promptTokens ?? 0,
        tokensOut: result.usage?.completionTokens ?? 0,
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async *stream(task: Task, context: AgentContext): AsyncIterable<StreamChunk> {
    const systemPrompt = this.buildSystemPrompt(context);
    const messages = this.buildMessages(task, context);

    const result = aiStreamText({
      model: this.getModel(context),
      system: systemPrompt,
      messages,
    });

    for await (const chunk of (await result).textStream) {
      yield {
        type: 'text',
        content: chunk,
        agentRole: this.role,
        timestamp: Date.now(),
      };
    }
  }

  async handoff(toAgent: AgentRole, payload: HandoffPayload): Promise<void> {
    // In MVP, handoff is managed by the orchestrator, not the agent.
    // This method exists to satisfy the interface for future framework swaps.
  }

  private buildSystemPrompt(context: AgentContext): string {
    let prompt = getAgentPrompt(this.role);

    // Append previous agent results as context (capped to prevent context explosion)
    if (context.previousResults.length > 0) {
      prompt += '\n\n## Previous Agent Results\n';
      prompt += 'The following agents have already completed their work. Use their output as context:\n\n';

      const MAX_RESULT_CHARS = 12_000; // ~3k tokens per result

      for (const result of context.previousResults) {
        const content =
          result.content.length > MAX_RESULT_CHARS
            ? result.content.slice(0, MAX_RESULT_CHARS) + '\n\n[...output truncated for context limit]'
            : result.content;
        prompt += `### ${result.role}\n${content}\n\n`;
      }
    }

    // Append existing files if available (skip if previous results already provide context)
    if (Object.keys(context.files).length > 0 && context.previousResults.length === 0) {
      prompt += '\n\n## Existing Project Files\n';

      for (const [path, content] of Object.entries(context.files)) {
        prompt += `\n### ${path}\n\`\`\`\n${content}\n\`\`\`\n`;
      }
    }

    return prompt;
  }

  private buildMessages(task: Task, context: AgentContext) {
    const messages = context.conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Add the task description as the final instruction
    messages.push({
      role: 'user',
      content: `Current task: ${task.title}\n\n${task.description}`,
    });

    return messages;
  }

  private getModel(context: AgentContext): any {
    if (!context.model) {
      throw new Error(`No model instance provided in agent context for ${this.role}`);
    }

    return context.model;
  }
}
