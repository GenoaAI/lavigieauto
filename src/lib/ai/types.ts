import { z } from 'zod';
import {
  InvoiceExtractionSchema,
  TechnicalInspectionExtractionSchema,
  MaintenanceBookExtractionSchema,
  RegistrationCardExtractionSchema,
} from './schemas';

export type DocumentType =
  | 'INVOICE'
  | 'TECHNICAL_INSPECTION'
  | 'MAINTENANCE_BOOK'
  | 'REGISTRATION_CARD'
  | 'GENERIC';

export interface VehicleContext {
  vin?: string;
  licensePlate?: string;
  make?: string;
  model?: string;
  version?: string;
  year?: number;
  fuelType?: 'ESSENCE' | 'DIESEL' | 'HYBRIDE' | 'ELECTRIQUE' | 'GPL' | string;
  currentMileage?: number;
  annualAverageMileage?: number;
  firstRegistrationDate?: string;
}

export interface ExtractionRequest {
  documentType: DocumentType;
  fileBase64?: string;
  fileUrl?: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | string;
  vehicleContext?: VehicleContext;
  customPrompt?: string;
  rawText?: string;
}

export interface ExtractionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd?: number;
}

export interface ExtractionResponse<T> {
  success: boolean;
  data: T | null;
  confidenceScore: number; // 0 to 1
  rawResponse?: string;
  warnings?: string[];
  errors?: string[];
  usage?: ExtractionUsage;
  provider: string;
  model: string;
  extractedAt: string; // ISO 8601
}

export type InvoiceExtraction = z.infer<typeof InvoiceExtractionSchema>;
export type TechnicalInspectionExtraction = z.infer<typeof TechnicalInspectionExtractionSchema>;
export type MaintenanceBookExtraction = z.infer<typeof MaintenanceBookExtractionSchema>;
export type RegistrationCardExtraction = z.infer<typeof RegistrationCardExtractionSchema>;

export type ProviderType = 'gemini' | 'openai' | 'mock';

export interface LLMProviderConfig {
  provider: ProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface ImageAttachment {
  data: string; // base64
  mimeType: string;
}

export interface StructuredGenerationOptions<T> {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodType<any>;
  images?: ImageAttachment[];
  temperature?: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly defaultModel: string;

  extractInvoice(
    request: ExtractionRequest
  ): Promise<ExtractionResponse<InvoiceExtraction>>;

  extractTechnicalInspection(
    request: ExtractionRequest
  ): Promise<ExtractionResponse<TechnicalInspectionExtraction>>;

  extractMaintenanceBook(
    request: ExtractionRequest
  ): Promise<ExtractionResponse<MaintenanceBookExtraction>>;

  extractRegistrationCard(
    request: ExtractionRequest
  ): Promise<ExtractionResponse<RegistrationCardExtraction>>;

  generateStructuredJson<T>(
    options: StructuredGenerationOptions<T>
  ): Promise<ExtractionResponse<T>>;

  generateText(
    prompt: string,
    systemPrompt?: string,
    images?: ImageAttachment[]
  ): Promise<string>;
}
