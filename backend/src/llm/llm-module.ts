import { Module } from '@nestjs/common';
import { DeepseekLlmClient } from './deepseek-llm-client';
import { LLM_CLIENT } from './llm-client';

@Module({
  providers: [
    {
      provide: LLM_CLIENT,
      useClass: DeepseekLlmClient,
    },
  ],
  exports: [LLM_CLIENT],
})
export class LlmModule {}
