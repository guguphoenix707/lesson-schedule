export const LLM_CLIENT = Symbol('LLM_CLIENT');

export type LlmChatMessage = {
  role: 'system' | 'user';
  content: string;
};

export type LlmGenerateInput = {
  messages: LlmChatMessage[];
  maxOutputTokens: number;
};

export type LlmGenerateResult = {
  text: string;
};

export interface LlmClient {
  generate(input: LlmGenerateInput): Promise<LlmGenerateResult>;
}

export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmConfigError';
  }
}

export class LlmTimeoutError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LlmTimeoutError';
  }
}

export class LlmUpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LlmUpstreamError';
  }
}
