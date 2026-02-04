import type { FastifyReply } from 'fastify';

export class StreamWriter {
  private reply: FastifyReply;

  constructor(reply: FastifyReply) {
    this.reply = reply;
  }

  writeText(text: string): void {
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    this.reply.raw.write(`0:"${escaped}"\n`);
  }

  writeProgress(data: Record<string, unknown>): void {
    this.reply.raw.write(`2:${JSON.stringify(data)}\n`);
  }

  writeUsage(data: { tokensIn: number; tokensOut: number }): void {
    this.reply.raw.write(`8:${JSON.stringify(data)}\n`);
  }

  close(): void {
    this.reply.raw.end();
  }
}
