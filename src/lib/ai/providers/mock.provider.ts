import { BaseLLMProvider } from './base.provider';
import { LLMProviderConfig, ImageAttachment, ExtractionUsage } from '../types';

/**
 * Mock LLM Provider for offline testing, CI/CD, and fast local development
 */
export class MockLLMProvider extends BaseLLMProvider {
  public readonly name = 'mock';
  public readonly defaultModel = 'mock-v1';

  constructor(config: Partial<LLMProviderConfig> = {}) {
    super(config);
  }

  protected async executeGeneration(
    prompt: string,
    _systemPrompt?: string,
    _images?: ImageAttachment[]
  ): Promise<{ text: string; usage?: ExtractionUsage }> {
    // Return structured mock response depending on prompt content
    if (prompt.includes('Contrôle Technique') || prompt.includes('contrôle technique')) {
      return {
        text: JSON.stringify({
          center: {
            name: 'DEKRA Auto Sécurité',
            approvalNumber: 'A75001234',
            inspectorName: 'J. Dupont',
            address: '14 Rue de la Paix, 75002 Paris',
            inspectionDate: '2026-03-15',
          },
          vehicle: {
            licensePlate: 'AA-123-BB',
            vin: 'VF3XXXXXXXXXXXXXX',
            make: 'Peugeot',
            model: '308',
            firstRegistrationDate: '2019-04-10',
            mileage: 82450,
            fuelType: 'Diesel',
          },
          result: 'UNFAVORABLE_MAJOR',
          validUntilDate: '2026-05-15',
          defects: [
            {
              code: '5.2.3.d.2',
              label: 'Pneumatiques : Usure anormale ou présence d\'un corps étranger',
              severity: 'MAJOR',
              location: 'AVD',
              category: 'AXLES_WHEELS_TIRES_SUSPENSION',
              detailedExplanation: 'Usure prononcée sur le flanc extérieur du pneu avant droit.',
            },
            {
              code: '1.1.13.a.1',
              label: 'Plaquettes de frein : Usure importante',
              severity: 'MINOR',
              location: 'AVG, AVD',
              category: 'BRAKES',
              detailedExplanation: 'Garniture de plaquette proche de la limite d\'usure.',
            },
          ],
          measurements: {
            brakingEfficiencyPercentage: 62,
            brakingImbalanceFrontPercentage: 8,
            brakingImbalanceRearPercentage: 12,
            suspensionImbalancePercentage: 6,
            smokeOpacity: 0.45,
            obdReadoutClean: true,
          },
        }),
        usage: {
          promptTokens: 250,
          completionTokens: 280,
          totalTokens: 530,
          latencyMs: 15,
          estimatedCostUsd: 0,
        },
      };
    }

    if (prompt.includes('plan de maintenance') || prompt.includes('carnet d\'entretien')) {
      return {
        text: JSON.stringify({
          vehicleTarget: {
            make: 'Peugeot',
            model: '308 1.5 BlueHDi',
            engineType: 'DV5RD',
            fuelType: 'Diesel',
            gearboxType: 'MANUAL',
          },
          recommendedOperations: [
            {
              operationName: 'Vidange huile moteur & remplacement filtre',
              category: 'DRAIN_OIL',
              intervalKm: 20000,
              intervalMonths: 12,
              severeIntervalKm: 15000,
              severeIntervalMonths: 12,
              mandatory: true,
              specifications: 'Norme PSA B71 2290 0W30',
            },
            {
              operationName: 'Remplacement filtre d\'habitacle',
              category: 'CABIN_FILTER',
              intervalKm: 20000,
              intervalMonths: 12,
              mandatory: true,
            },
            {
              operationName: 'Remplacement liquide de frein',
              category: 'BRAKE_FLUID',
              intervalKm: 40000,
              intervalMonths: 24,
              mandatory: true,
              specifications: 'DOT 4+',
            },
            {
              operationName: 'Kit distribution et pompe à eau',
              category: 'TIMING_BELT',
              intervalKm: 100000,
              intervalMonths: 72,
              mandatory: true,
            },
          ],
          historicalServices: [],
        }),
        usage: {
          promptTokens: 180,
          completionTokens: 220,
          totalTokens: 400,
          latencyMs: 10,
          estimatedCostUsd: 0,
        },
      };
    }

    // Default: Workshop Invoice mock
    return {
      text: JSON.stringify({
        garage: {
          name: 'Garage Central de l\'Étoile',
          siret: '44321289400021',
          vatNumber: 'FR12443212894',
          address: '25 Avenue de la République, 69002 Lyon',
          phone: '04 72 00 11 22',
          email: 'contact@garage-etoile.fr',
          brandNetwork: 'Eurorepar',
        },
        vehicle: {
          licensePlate: 'AA-123-BB',
          vin: 'VF3XXXXXXXXXXXXXX',
          make: 'Peugeot',
          model: '308',
          version: '1.5 BlueHDi 130 S&S',
          currentMileage: 82450,
        },
        invoice: {
          invoiceNumber: 'FAC-2026-0489',
          invoiceDate: '2026-03-20',
          paymentMethod: 'Carte Bancaire',
          totalHT: 312.5,
          totalVAT: 62.5,
          totalTTC: 375.0,
          currency: 'EUR',
        },
        lineItems: [
          {
            description: 'Vidange moteur synthétique 0W30 C2/C3',
            category: 'DRAIN_OIL',
            partNumber: 'OIL-0W30-5L',
            quantity: 1,
            unitPriceHT: 65.0,
            vatRate: 20,
            totalTTC: 78.0,
            isLabor: false,
            isPart: true,
          },
          {
            description: 'Filtre à huile PURFLUX',
            category: 'DRAIN_OIL',
            partNumber: 'L358A',
            quantity: 1,
            unitPriceHT: 15.0,
            vatRate: 20,
            totalTTC: 18.0,
            isLabor: false,
            isPart: true,
          },
          {
            description: 'Remplacement filtre habitacle anti-allergène',
            category: 'CABIN_FILTER',
            partNumber: 'AHC245',
            quantity: 1,
            unitPriceHT: 28.0,
            vatRate: 20,
            totalTTC: 33.6,
            isLabor: false,
            isPart: true,
          },
          {
            description: 'Plaquettes de frein avant jeu complet',
            category: 'BRAKE_PADS_FRONT',
            partNumber: 'BOSCH-0986494657',
            quantity: 1,
            unitPriceHT: 74.5,
            vatRate: 20,
            totalTTC: 89.4,
            isLabor: false,
            isPart: true,
          },
          {
            description: 'Main d\'oeuvre révision périodique + freins AV',
            category: 'LABOR_ONLY',
            quantity: 2.0,
            unitPriceHT: 65.0,
            vatRate: 20,
            totalTTC: 156.0,
            isLabor: true,
            isPart: false,
          },
        ],
        maintenanceRecap: {
          oilGrade: '0W30 PSA B71 2290',
          oilQuantityLiters: 4.2,
          nextRecommendedMileage: 102450,
          nextRecommendedDate: '2027-03-20',
          detectedOperations: ['DRAIN_OIL', 'CABIN_FILTER', 'BRAKE_PADS_FRONT'],
        },
        observations: [
          'Contrôle visuel OK',
          'Pneu avant droit à remplacer prochainement (usure asymétrique)',
        ],
      }),
      usage: {
        promptTokens: 310,
        completionTokens: 390,
        totalTokens: 700,
        latencyMs: 20,
        estimatedCostUsd: 0,
      },
    };
  }
}
