import { Injectable, Logger } from '@nestjs/common';
import { env } from '../env';
import {
  LlmConfigError,
  LlmTimeoutError,
  LlmUpstreamError,
  type LlmClient,
  type LlmGenerateInput,
  type LlmGenerateResult,
} from './llm-client';

const requestTimeoutMs = 25_000;

@Injectable()
export class DeepseekLlmClient implements LlmClient {
  private readonly logger = new Logger(DeepseekLlmClient.name);

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    const apiKey = env.deepseekApiKey;
    if (!apiKey) {
      throw new LlmConfigError('AI 草稿暂不可用，请手写沟通草稿');
    }

    let response: Response;
    try {
      response = await fetch(`${env.deepseekBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.deepseekModel,
          messages: input.messages,
          max_tokens: input.maxOutputTokens,
          stream: false,
          temperature: 0.6,
          thinking: { type: 'disabled' },
        }),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (error) {
      this.logger.warn(`DeepSeek request failed: ${describeError(error)}`);
      if (isAbortError(error)) {
        throw new LlmTimeoutError('AI 草稿生成超时', { cause: error });
      }
      throw new LlmUpstreamError('无法连接大模型服务', { cause: error });
    }

    if (response.status === 401 || response.status === 403) {
      this.logger.warn(`DeepSeek rejected credentials: HTTP ${response.status}`);
      throw new LlmConfigError('AI 草稿暂不可用，请手写沟通草稿');
    }

    if (!response.ok) {
      this.logger.warn(
        `DeepSeek returned HTTP ${response.status}: ${await readErrorMessage(response)}`,
      );
      throw new LlmUpstreamError('AI 草稿上游返回失败');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      this.logger.warn(`DeepSeek response was not JSON: ${describeError(error)}`);
      throw new LlmUpstreamError('AI 草稿上游响应无效', { cause: error });
    }

    const text = readAssistantText(payload);
    if (!text) {
      this.logger.warn('DeepSeek returned empty assistant content');
      throw new LlmUpstreamError('AI 草稿上游未返回正文');
    }

    return { text };
  }
}

function readAssistantText(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return '';
  }
  const first = payload.choices[0];
  if (!isRecord(first) || !isRecord(first.message)) {
    return '';
  }
  return readContent(first.message.content).trim();
}

function readContent(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (!Array.isArray(value)) {
    return '';
  }
  return value
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }
      if (isRecord(part) && typeof part.text === 'string') {
        return part.text;
      }
      return '';
    })
    .join('');
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'TimeoutError')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'unknown';
  }
  const cause =
    error.cause instanceof Error ? ` (${error.cause.name}: ${error.cause.message})` : '';
  return `${error.name}: ${error.message}${cause}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      isRecord(payload) &&
      isRecord(payload.error) &&
      typeof payload.error.message === 'string'
    ) {
      return payload.error.message.slice(0, 180);
    }
  } catch {
    // The body is only used for diagnostics.
  }
  return 'no error message';
}
