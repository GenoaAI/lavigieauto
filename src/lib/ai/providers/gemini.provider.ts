import { BaseLLMProvider } from './base.provider';
import { LLMProviderConfig, ImageAttachment, ExtractionUsage } from '../types';

export class GeminiLLMProvider extends BaseLLMProvider {
  public readonly name = 'gemini';
  public readonly defaultModel = 'gemini-flash-latest';

  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  // Pool de modèles officiels Google Generative Language API
  private availableModels = [
    'gemini-flash-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
  ];

  constructor(config: Partial<LLMProviderConfig> = {}) {
    super(config);
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '' : '');
  }

  protected async executeGeneration(
    prompt: string,
    systemPrompt?: string,
    images?: ImageAttachment[]
  ): Promise<{ text: string; usage?: ExtractionUsage }> {
    if (!this.apiKey) {
      throw new Error(
        'Gemini API Key is missing. Please set GEMINI_API_KEY environment variable or provide apiKey in configuration.'
      );
    }

    const preferredModel = this.config.model || this.defaultModel;
    const modelCandidates = Array.from(new Set([preferredModel, ...this.availableModels]));

    let lastError: Error | null = null;

    for (const modelName of modelCandidates) {
      const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;
      const parts: any[] = [];

      // Attach images / documents if present
      if (images && images.length > 0) {
        for (const img of images) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data,
            },
          });
        }
      }

      // Add main user prompt
      parts.push({
        text: prompt,
      });

      const requestBody: any = {
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          temperature: this.config.temperature ?? 0.1,
          maxOutputTokens: this.config.maxTokens ?? 4096,
          responseMimeType: 'application/json',
        },
      };

      if (systemPrompt) {
        requestBody.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 25000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 429 || response.status === 404 || response.status === 503) {
            console.warn(`[Gemini Provider] Modèle ${modelName} indisponible (HTTP ${response.status}). Basculement sur le modèle suivant...`);
            lastError = new Error(`Gemini ${modelName} HTTP ${response.status}: ${errorText}`);
            continue;
          }
          throw new Error(`Gemini API HTTP Error ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        const candidate = json.candidates?.[0];

        if (!candidate || !candidate.content?.parts?.[0]?.text) {
          console.warn(`[Gemini Provider] Modèle ${modelName} a renvoyé un contenu vide. Basculement...`);
          continue;
        }

        const text = candidate.content.parts[0].text;
        const usageMetadata = json.usageMetadata;

        const usage: ExtractionUsage | undefined = usageMetadata
          ? {
              promptTokens: usageMetadata.promptTokenCount || 0,
              completionTokens: usageMetadata.candidatesTokenCount || 0,
              totalTokens: usageMetadata.totalTokenCount || 0,
              latencyMs: 0,
              estimatedCostUsd:
                ((usageMetadata.promptTokenCount || 0) * 0.075 +
                  (usageMetadata.candidatesTokenCount || 0) * 0.3) /
                1000000,
            }
          : undefined;

        return { text, usage };
      } catch (err: any) {
        console.warn(`[Gemini Provider] Erreur sur ${modelName} (${err.message}). Basculement vers le modèle suivant...`);
        lastError = err;
        continue;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new Error('Tous les modèles Gemini ont échoué.');
  }
}
