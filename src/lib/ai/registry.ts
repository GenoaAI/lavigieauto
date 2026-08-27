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
    const envProvider = typeof process !== 'undefined' ? ((process.env.DEFAULT_AI_PROVIDER || process.env.AI_PROVIDER) as ProviderType) : undefined;
    const geminiKey = typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '') : '';
    const openAIKey = typeof process !== 'undefined' ? (process.env.OPENAI_API_KEY || '') : '';
    const hasGemini = Boolean(geminiKey && geminiKey.trim() !== '');
    const hasOpenAI = Boolean(openAIKey && openAIKey.trim() !== '');

    if (envProvider && ['gemini', 'openai', 'mock'].includes(envProvider.trim())) {
      this.defaultProviderType = envProvider.trim() as ProviderType;
    } else if (hasGemini) {
      this.defaultProviderType = 'gemini';
    } else if (hasOpenAI) {
      this.defaultProviderType = 'openai';
    } else {
      // En production, ne JAMAIS basculer silencieusement sur un mock avec des fausses données (Règle GEMINI.md Zéro Fake Data).
      // On cible 'gemini' par défaut afin de lever une erreur claire indiquant la configuration de la clé API.
      this.defaultProviderType = process.env.NODE_ENV === 'test' ? 'mock' : 'gemini';
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
