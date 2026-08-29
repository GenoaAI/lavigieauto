import { z } from 'zod';
import {
  LLMProvider,
  LLMProviderConfig,
  ExtractionRequest,
  ExtractionResponse,
  InvoiceExtraction,
  TechnicalInspectionExtraction,
  MaintenanceBookExtraction,
  RegistrationCardExtraction,
  ImageAttachment,
  StructuredGenerationOptions,
  ExtractionUsage,
  VehicleContext,
} from '../types';
import {
  InvoiceExtractionSchema,
  TechnicalInspectionExtractionSchema,
  MaintenanceBookExtractionSchema,
  RegistrationCardExtractionSchema,
} from '../schemas';
import { loadSkillPrompt } from '../skills-loader';

export abstract class BaseLLMProvider implements LLMProvider {
  public abstract readonly name: string;
  public abstract readonly defaultModel: string;

  protected config: LLMProviderConfig;

  constructor(config: Partial<LLMProviderConfig> = {}) {
    this.config = {
      provider: config.provider || 'gemini',
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature ?? 0.1, // Low temp for extraction precision
      maxTokens: config.maxTokens ?? 8192,
      maxRetries: config.maxRetries ?? 3,
      timeoutMs: config.timeoutMs ?? 30000,
    };
  }

  /**
   * Abstract call implemented by concrete providers (Gemini, OpenAI, Mock)
   */
  protected abstract executeGeneration(
    prompt: string,
    systemPrompt?: string,
    images?: ImageAttachment[]
  ): Promise<{ text: string; usage?: ExtractionUsage }>;

  /**
   * Generic structured JSON extraction with Zod schema validation & auto-retry
   */
  public async generateStructuredJson<T>(
    options: StructuredGenerationOptions<T>
  ): Promise<ExtractionResponse<T>> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;
    let warnings: string[] = [];

    const enrichedSystemPrompt = `
${options.systemPrompt || "Tu es un expert automobile certifié spécialisé dans l'analyse documentaire (cartes grises, factures garage, procès-verbaux de contrôle technique et plans d'entretien constructeur)."}

INSTRUCTIONS CRITIQUES :
1. Analyse minutieusement l'image ou le document PDF fourni en pièce jointe.
2. Extrais les données visibles et retourne EXCLUSIVEMENT un objet JSON valide.
3. Remplis scrupuleusement les champs avec le texte lisible sur le document.
4. Normalise les dates au format ISO 8601 (YYYY-MM-DD).
5. Ne retourne jamais d'objet vide si le document contient du texte lisible.
`.trim();

    while (attempts < (this.config.maxRetries || 3)) {
      attempts++;
      try {
        const generationResult = await this.executeGeneration(
          options.prompt,
          enrichedSystemPrompt,
          options.images
        );

        const latencyMs = Date.now() - startTime;
        const parsed = this.robustJsonParse(generationResult.text);

        // Zod schema validation
        const validationResult = options.schema.safeParse(parsed);

        if (!validationResult.success) {
          const zodErrors = validationResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          );
          warnings.push(`Tentative ${attempts}: validation Zod (${zodErrors.join(', ')})`);

          // Toujours renvoyer les données parsées même si le schéma a des champs additionnels
          return {
            success: true,
            data: parsed as T,
            confidenceScore: 0.85,
            rawResponse: generationResult.text,
            warnings,
            usage: generationResult.usage ? { ...generationResult.usage, latencyMs } : undefined,
            provider: this.name,
            model: this.config.model || this.defaultModel,
            extractedAt: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data: validationResult.data as T,
          confidenceScore: 0.95,
          rawResponse: generationResult.text,
          warnings: warnings.length > 0 ? warnings : undefined,
          usage: generationResult.usage ? { ...generationResult.usage, latencyMs } : undefined,
          provider: this.name,
          model: this.config.model || this.defaultModel,
          extractedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        lastError = err;
        warnings.push(`Tentative ${attempts} en erreur : ${err.message}`);
        await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
      }
    }

    return {
      success: false,
      data: null,
      confidenceScore: 0,
      errors: [lastError?.message || 'Erreur inconnue lors de la génération structurée.'],
      warnings,
      provider: this.name,
      model: this.config.model || this.defaultModel,
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Generic free text generation
   */
  public async generateText(
    prompt: string,
    systemPrompt?: string,
    images?: ImageAttachment[]
  ): Promise<string> {
    const result = await this.executeGeneration(prompt, systemPrompt, images);
    return result.text;
  }

  /**
   * Extract Workshop / Garage Invoice
   */
  public async extractInvoice(
    request: ExtractionRequest
  ): Promise<ExtractionResponse<InvoiceExtraction>> {
    const images = this.prepareImages(request);
    const vehicleCtx = request.vehicleContext;
    const skill = loadSkillPrompt('invoice-parser', {
      vehicleContext: vehicleCtx ? `Contexte véhicule : ${vehicleCtx.make || ''} ${vehicleCtx.model || ''} (${vehicleCtx.licensePlate || ''})` : '',
      rawTextContext: request.rawText ? `Texte brut OCR disponible :\n${request.rawText}` : '',
      customPromptContext: request.customPrompt ? `Consigne spécifique : ${request.customPrompt}` : '',
    });

    return this.generateStructuredJson<InvoiceExtraction>({
      prompt: skill.prompt,
      schema: InvoiceExtractionSchema,
      images,
      systemPrompt: skill.systemPrompt,
    });
  }

  /**
   * Extract Technical Inspection (PV de Contrôle Technique)
   */
  public async extractTechnicalInspection(
    request: ExtractionRequest
  ): Promise<ExtractionResponse<TechnicalInspectionExtraction>> {
    const images = this.prepareImages(request);
    const vehicleCtx = request.vehicleContext;
    const skill = loadSkillPrompt('technical-inspection-parser', {
      vehicleContext: vehicleCtx ? `Contexte véhicule : ${vehicleCtx.make || ''} ${vehicleCtx.model || ''} (${vehicleCtx.licensePlate || ''})` : '',
      rawTextContext: request.rawText ? `Texte brut OCR disponible :\n${request.rawText}` : '',
      customPromptContext: request.customPrompt ? `Consigne spécifique : ${request.customPrompt}` : '',
    });

    return this.generateStructuredJson<TechnicalInspectionExtraction>({
      prompt: skill.prompt,
      schema: TechnicalInspectionExtractionSchema,
      images,
      systemPrompt: skill.systemPrompt,
    });
  }

  /**
   * Extract Carte Grise (Certificat d'Immatriculation)
   */
  public async extractRegistrationCard(
    request: ExtractionRequest
  ): Promise<ExtractionResponse<RegistrationCardExtraction>> {
    const images = this.prepareImages(request);
    const skill = loadSkillPrompt('registration-card-parser', {
      rawTextContext: request.rawText ? `Texte brut OCR disponible :\n${request.rawText}` : '',
      customPromptContext: request.customPrompt ? `Consigne spécifique : ${request.customPrompt}` : '',
    });

    return this.generateStructuredJson<RegistrationCardExtraction>({
      prompt: skill.prompt,
      schema: RegistrationCardExtractionSchema,
      images,
      systemPrompt: skill.systemPrompt,
    });
  }

  /**
   * Extract Maintenance Book / Schedule
   */
  public async extractMaintenanceBook(
    request: ExtractionRequest
  ): Promise<ExtractionResponse<MaintenanceBookExtraction>> {
    const images = this.prepareImages(request);
    const vehicleCtx = request.vehicleContext;
    const skill = loadSkillPrompt('maintenance-book-parser', {
      vehicleContext: vehicleCtx ? `Contexte véhicule : ${vehicleCtx.make || ''} ${vehicleCtx.model || ''}` : '',
      rawTextContext: request.rawText ? `Texte brut OCR disponible :\n${request.rawText}` : '',
      customPromptContext: request.customPrompt ? `Consigne spécifique : ${request.customPrompt}` : '',
    });

    return this.generateStructuredJson<MaintenanceBookExtraction>({
      prompt: skill.prompt,
      schema: MaintenanceBookExtractionSchema,
      images,
      systemPrompt: skill.systemPrompt,
    });
  }

  /**
   * Parse JSON de manière ultra-résiliente avec auto-réparation (virgules orphelines, guillemets non fermés, troncature)
   */
  public robustJsonParse(rawText: string): any {
    const cleaned = this.sanitizeJsonString(rawText);

    // 1. Décodage standard
    try {
      return JSON.parse(cleaned);
    } catch (firstErr) {
      // 2. Nettoyage chirurgical
      let repaired = cleaned;
      // Supprimer commentaires
      repaired = repaired.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*/g, '$1');
      // Supprimer virgules orphelines avant } ou ]
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      // Remplacer guillemets typographiques
      repaired = repaired.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

      try {
        return JSON.parse(repaired);
      } catch {
        // 3. Réparation des fermetures et chaînes tronquées
        let balanced = repaired.trim();
        const quoteCount = (balanced.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          balanced += '"';
        }
        balanced = balanced.replace(/,\s*$/, '');
        const openBraces = (balanced.match(/\{/g) || []).length;
        const closeBraces = (balanced.match(/\}/g) || []).length;
        const openBrackets = (balanced.match(/\[/g) || []).length;
        const closeBrackets = (balanced.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
          balanced += ']'.repeat(openBrackets - closeBrackets);
        }
        if (openBraces > closeBraces) {
          balanced += '}'.repeat(openBraces - closeBraces);
        }
        balanced = balanced.replace(/,(\s*[}\]])/g, '$1');

        try {
          return JSON.parse(balanced);
        } catch {
          // 4. Si un élément de tableau a été tronqué au milieu, découper au dernier objet complet
          const lastValidItemMatch = balanced.match(/^([\s\S]*\}\s*),[^}]*$/);
          if (lastValidItemMatch && lastValidItemMatch[1]) {
            let truncated = lastValidItemMatch[1].trim();
            const ob = (truncated.match(/\{/g) || []).length;
            const cb = (truncated.match(/\}/g) || []).length;
            const obr = (truncated.match(/\[/g) || []).length;
            const cbr = (truncated.match(/\]/g) || []).length;
            if (obr > cbr) truncated += ']'.repeat(obr - cbr);
            if (ob > cb) truncated += '}'.repeat(ob - cb);
            try {
              return JSON.parse(truncated);
            } catch {}
          }
          throw firstErr;
        }
      }
    }
  }

  /**
   * Sanitize and extract JSON string from raw markdown LLM responses
   */
  protected sanitizeJsonString(raw: string): string {
    let text = raw.trim();

    // Match code block ```json ... ``` or ``` ... ```
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      text = codeBlockMatch[1].trim();
    }

    // Find first { or [ and last } or ]
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');

    let start = 0;
    let end = text.length;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = lastBrace !== -1 ? lastBrace + 1 : text.length;
    } else if (firstBracket !== -1) {
      start = firstBracket;
      end = lastBracket !== -1 ? lastBracket + 1 : text.length;
    }

    return text.substring(start, end).trim();
  }

  protected prepareImages(request: ExtractionRequest): ImageAttachment[] | undefined {
    if (!request.fileBase64) return undefined;
    return [
      {
        data: request.fileBase64,
        mimeType: request.mimeType,
      },
    ];
  }

  protected buildInvoicePrompt(context?: VehicleContext, customPrompt?: string, rawText?: string): string {
    return `
Analyse cette facture d'atelier / garage automobile.
Extrais les données détaillées : émetteur/garage, véhicule, date, kilométrage relevé, liste exhaustive des pièces et main d'oeuvre avec montants HT et TTC, récapitulatif de maintenance (grade d'huile, opérations réalisées).

${context ? `Contexte véhicule connu : ${context.make || ''} ${context.model || ''} (${context.licensePlate || ''})` : ''}
${customPrompt ? `Consigne spécifique : ${customPrompt}` : ''}
${rawText ? `Texte brut OCR disponible : ${rawText}` : ''}
`.trim();
  }

  protected buildTechnicalInspectionPrompt(context?: VehicleContext, customPrompt?: string, rawText?: string): string {
    return `
Analyse ce procès-verbal de Contrôle Technique (PV de CT).
Extrais le centre, la date de visite, la date limite de validité, le résultat global (A, S, R), le kilométrage exact et la liste intégrale des défaillances mineures, majeures et critiques avec vulgarisation claire pour le grand public.

${context ? `Contexte véhicule connu : ${context.make || ''} ${context.model || ''} (${context.licensePlate || ''})` : ''}
${customPrompt ? `Consigne spécifique : ${customPrompt}` : ''}
${rawText ? `Texte brut OCR disponible : ${rawText}` : ''}
`.trim();
  }

  protected buildMaintenanceBookPrompt(context?: VehicleContext, customPrompt?: string, rawText?: string): string {
    return `
Analyse ce plan d'entretien constructeur ou livret de service.
Extrais les préconisations officielles de maintenance (catégorie, périodicité en km et en mois) et l'historique des tampons/révisions.

${context ? `Contexte véhicule : ${context.make || ''} ${context.model || ''}` : ''}
`.trim();
  }
}
