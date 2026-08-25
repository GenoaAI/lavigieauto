import { BaseLLMProvider } from './base.provider';
import { LLMProviderConfig, ImageAttachment, ExtractionUsage } from '../types';

export class OpenAILLMProvider extends BaseLLMProvider {
  public readonly name = 'openai';
  public readonly defaultModel = 'gpt-4o-mini';

  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: Partial<LLMProviderConfig> = {}) {
    super(config);
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY || '' : '');
  }

  protected async executeGeneration(
    prompt: string,
    systemPrompt?: string,
    images?: ImageAttachment[]
  ): Promise<{ text: string; usage?: ExtractionUsage }> {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API Key is missing. Please set OPENAI_API_KEY environment variable or provide apiKey in configuration.'
      );
    }

    const modelName = this.config.model || this.defaultModel;
    const url = `${this.baseUrl}/chat/completions`;

    const messages: any[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Prepare user message content (multimodal or text)
    if (images && images.length > 0) {
      const userContent: any[] = [
        {
          type: 'text',
          text: prompt,
        },
      ];

      for (const img of images) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${img.data}`,
            detail: 'high',
          },
        });
      }

      messages.push({
        role: 'user',
        content: userContent,
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt,
      });
    }

    const requestBody: any = {
      model: modelName,
      messages,
      temperature: this.config.temperature ?? 0.1,
      max_tokens: this.config.maxTokens ?? 4096,
      response_format: { type: 'json_object' },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API HTTP Error ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const choice = json.choices?.[0];

      if (!choice || !choice.message?.content) {
        throw new Error('OpenAI API returned an empty response choice.');
      }

      const text = choice.message.content;
      const usageMetadata = json.usage;

      const usage: ExtractionUsage | undefined = usageMetadata
        ? {
            promptTokens: usageMetadata.prompt_tokens || 0,
            completionTokens: usageMetadata.completion_tokens || 0,
            totalTokens: usageMetadata.total_tokens || 0,
            latencyMs: 0,
            // Estimated GPT-4o-mini price ($0.15/1M in, $0.60/1M out)
            estimatedCostUsd:
              ((usageMetadata.prompt_tokens || 0) * 0.15 +
                (usageMetadata.completion_tokens || 0) * 0.6) /
              1000000,
          }
        : undefined;

      return { text, usage };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${this.config.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
