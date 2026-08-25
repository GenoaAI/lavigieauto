import { LLMProvider, LLMProviderConfig, ProviderType } from './types';
import { GeminiLLMProvider } from './providers/gemini.provider';
import { OpenAILLMProvider } from './providers/openai.provider';
import { MockLLMProvider } from './providers/mock.provider';

export class AIProviderRegistry {
  private static instance: AIProviderRegistry;
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProviderType: ProviderType = 'gemini';

  private constructor() {
    this.detectDefaultProvider();
  }

  public static getInstance(): AIProviderRegistry {
    if (!AIProviderRegistry.instance) {
      AIProviderRegistry.instance = new AIProviderRegistry();
    }
    return AIProviderRegistry.instance;
  }

  /**
   * Automatically inspect environment to set default provider
   */
  private detectDefaultProvider(): void {
    const envProvider = typeof process !== 'undefined' ? (process.env.AI_PROVIDER as ProviderType) : undefined;
    const hasGemini = typeof process !== 'undefined' && Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    const hasOpenAI = typeof process !== 'undefined' && Boolean(process.env.OPENAI_API_KEY);

    if (envProvider && ['gemini', 'openai', 'mock'].includes(envProvider)) {
      this.defaultProviderType = envProvider;
    } else if (hasGemini) {
      this.defaultProviderType = 'gemini';
    } else if (hasOpenAI) {
      this.defaultProviderType = 'openai';
    } else {
      // Fallback to mock in dev/test when no API keys are provided
      this.defaultProviderType = 'mock';
    }
  }

  /**
   * Factory method to get or instantiate a provider
   */
  public getProvider(config?: Partial<LLMProviderConfig>): LLMProvider {
    const providerType = config?.provider || this.defaultProviderType;
    const cacheKey = `${providerType}-${config?.model || 'default'}-${config?.apiKey ? 'custom-key' : 'env-key'}`;

    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    let provider: LLMProvider;

    switch (providerType) {
      case 'gemini':
        provider = new GeminiLLMProvider(config);
        break;
      case 'openai':
        provider = new OpenAILLMProvider(config);
        break;
      case 'mock':
      default:
        provider = new MockLLMProvider(config);
        break;
    }

    this.providers.set(cacheKey, provider);
    return provider;
  }

  /**
   * Register a custom LLM provider implementation
   */
  public registerCustomProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Execute with automatic failover between providers
   */
  public async executeWithFallback<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    preferredProviders: ProviderType[] = ['gemini', 'openai', 'mock']
  ): Promise<T> {
    let lastError: Error | null = null;

    for (const providerType of preferredProviders) {
      try {
        const provider = this.getProvider({ provider: providerType });
        return await operation(provider);
      } catch (err: any) {
        lastError = err;
        console.warn(`[AIProviderRegistry] Provider ${providerType} failed: ${err.message}. Trying next fallback...`);
      }
    }

    throw lastError || new Error('All AI providers failed.');
  }
}

/**
 * Convenience helper function to get current default provider
 */
export function getAIProvider(config?: Partial<LLMProviderConfig>): LLMProvider {
  return AIProviderRegistry.getInstance().getProvider(config);
}
