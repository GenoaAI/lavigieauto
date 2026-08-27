import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseLLMProvider } from './base.provider';
import { LLMProviderConfig, ImageAttachment, ExtractionUsage } from '../types';

export class GeminiLLMProvider extends BaseLLMProvider {
  public readonly name = 'gemini';
  public readonly defaultModel = 'gemini-flash-latest';

  private apiKey: string;
  private genAI: GoogleGenerativeAI | null = null;

  // Pool de modèles réactifs et opérationnels avec repli automatique
  private availableModels = [
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
  ];

  constructor(config: Partial<LLMProviderConfig> = {}) {
    super(config);
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '' : '');
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
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

    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }

    const preferredModel = this.config.model || this.defaultModel;
    const modelCandidates = Array.from(new Set([preferredModel, ...this.availableModels]));

    let lastError: Error | null = null;

    for (const modelName of modelCandidates) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
          generationConfig: {
            temperature: this.config.temperature ?? 0.1,
            maxOutputTokens: this.config.maxTokens ?? 4096,
            responseMimeType: 'application/json',
          },
        });

        const contentParts: any[] = [];
        if (images && images.length > 0) {
          for (const img of images) {
            contentParts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.data,
              },
            });
          }
        }
        contentParts.push(prompt);

        const result = await model.generateContent(contentParts);
        const text = result.response.text();

        if (!text) {
          console.warn(`[Gemini Provider] Modèle ${modelName} a renvoyé un contenu vide. Basculement...`);
          continue;
        }

        const usageMetadata = (result.response as any).usageMetadata;
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
      }
    }

    throw lastError || new Error('Tous les modèles Gemini ont échoué.');
  }
}
