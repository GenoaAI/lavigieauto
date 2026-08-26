import { Garage, DocumentSource, LigneIntervention, Vehicule } from '../types/database.types';

export interface EnrichedGarage extends Partial<Garage> {
  id: string;
  nom: string;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  marque?: string | null;
  siret?: string | null;
  visitCount: number;
  lastVisitDate?: string | null;
  lastVisitMileage?: number | null;
  score: number; // 0 to 100
  reason: string;
  isBrandMatch: boolean;
}

export interface ResolveGarageOptions {
  vehicle: Partial<Vehicule>;
  garages: Partial<Garage>[];
  documents?: Partial<DocumentSource>[];
  interventions?: Partial<LigneIntervention>[];
  weightFrequency?: number; // default 0.45
  weightRecency?: number;   // default 0.45
  weightBrand?: number;     // default 0.10
}

export interface ResolveGarageResult {
  recommendedGarage: EnrichedGarage | null;
  allGarages: EnrichedGarage[];
  explanation: string;
}

/**
 * Calcule le score de récence (0 à 100) en fonction du délai écoulé depuis la dernière intervention
 */
export function calculateRecencyScore(lastVisitDateStr?: string | null): number {
  if (!lastVisitDateStr) return 0;
  const visitDate = new Date(lastVisitDateStr);
  if (isNaN(visitDate.getTime())) return 0;

  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24)));
  const diffMonths = diffDays / 30.4375;

  if (diffMonths <= 3) return 100;
  if (diffMonths <= 6) return 90;
  if (diffMonths <= 12) return 75;
  if (diffMonths <= 24) return 50;
  if (diffMonths <= 36) return 30;
  return 15;
}

/**
 * Calcule le score de fréquence normalisé (0 à 100)
 */
export function calculateFrequencyScore(visitCount: number, maxVisits: number): number {
  if (visitCount <= 0) return 0;
  if (maxVisits <= 1) return 100;
  // Score logarithmique / linéaire normalisé
  const ratio = visitCount / maxVisits;
  return Math.min(100, Math.round(ratio * 100));
}

/**
 * Vérifie l'affinité de marque entre le garage (nom ou marque) et le véhicule
 */
export function checkBrandAffinity(garageMarque?: string | null, garageNom?: string | null, vehicleMarque?: string | null): boolean {
  if (!vehicleMarque) return false;
  const vMake = vehicleMarque.toLowerCase().trim();
  if (!vMake) return false;

  const gMarque = (garageMarque || '').toLowerCase();
  const gNom = (garageNom || '').toLowerCase();

  return gMarque.includes(vMake) || gNom.includes(vMake);
}

/**
 * Algorithme de pondération intelligent pour choisir le garagiste par défaut :
 * - Fréquence dans le carnet d'entretien
 * - Récence de la dernière visite
 * - Affinité avec la marque du véhicule
 */
export function resolveRecommendedGarage(options: ResolveGarageOptions): ResolveGarageResult {
  const {
    vehicle,
    garages = [],
    documents = [],
    interventions = [],
    weightFrequency = 0.45,
    weightRecency = 0.45,
    weightBrand = 0.10,
  } = options;

  if (!garages || garages.length === 0) {
    // Si aucun garage explicite dans la table, extraction des garages uniques depuis les documents / interventions
    const fallbackGaragesMap = new Map<string, { nom: string; phone?: string; email?: string; address?: string }>();

    (documents || []).forEach((d) => {
      const em = (d.emetteur || '').trim();
      if (em && em !== 'Atelier Professionnel' && !em.toLowerCase().includes('ants') && !em.toLowerCase().includes('minist')) {
        const ocr = (d.ocr_structured_data || {}) as any;
        const phone = ocr.garage?.phone || (d.metadata as any)?.phone;
        const email = ocr.garage?.email || (d.metadata as any)?.email;
        const address = ocr.garage?.address || (d.metadata as any)?.address;
        if (!fallbackGaragesMap.has(em)) {
          fallbackGaragesMap.set(em, { nom: em, phone, email, address });
        }
      }
    });

    (interventions || []).forEach((l) => {
      const em = (l.emetteur || '').trim();
      if (em && em !== 'Atelier Professionnel' && em !== 'Garage' && !fallbackGaragesMap.has(em)) {
        fallbackGaragesMap.set(em, { nom: em });
      }
    });

    if (fallbackGaragesMap.size === 0) {
      return {
        recommendedGarage: null,
        allGarages: [],
        explanation: 'Aucun atelier répertorié pour ce véhicule dans le carnet.',
      };
    }

    // Convertir la map en garages virtuels pour calcul
    const virtualGarages: Partial<Garage>[] = Array.from(fallbackGaragesMap.values()).map((g, idx) => ({
      id: `virtual-${idx + 1}`,
      foyer_id: vehicle.foyer_id || '',
      nom: g.nom,
      telephone: g.phone || null,
      email: g.email || null,
      adresse: g.address || null,
      marque: null,
      siret: null,
      metadata: {},
    }));

    return resolveRecommendedGarage({
      ...options,
      garages: virtualGarages,
    });
  }

  // 1. Agréger les visites pour chaque garage
  const garageVisits = new Map<string, { count: number; lastDate: string | null; lastMileage: number | null }>();

  garages.forEach((g) => {
    if (g.id) {
      garageVisits.set(g.id, { count: 0, lastDate: null, lastMileage: null });
    }
  });

  // Associer documents / interventions
  (documents || []).forEach((d) => {
    if (d.file_type === 'facture' || d.file_type === 'devis' || d.file_type === 'carnet_entretien') {
      const matchedGarage = garages.find((g) => {
        if (d.garage_id && g.id === d.garage_id) return true;
        if (d.emetteur && g.nom && d.emetteur.toLowerCase().trim() === g.nom.toLowerCase().trim()) return true;
        return false;
      });

      if (matchedGarage && matchedGarage.id) {
        const stats = garageVisits.get(matchedGarage.id) || { count: 0, lastDate: null, lastMileage: null };
        stats.count += 1;
        if (d.date_document) {
          if (!stats.lastDate || new Date(d.date_document).getTime() > new Date(stats.lastDate).getTime()) {
            stats.lastDate = d.date_document;
            stats.lastMileage = d.kilometrage_document || stats.lastMileage;
          }
        }
        garageVisits.set(matchedGarage.id, stats);
      }
    }
  });

  // Associer interventions qui n'ont pas déjà incrémenté via document
  (interventions || []).forEach((l) => {
    const matchedGarage = garages.find((g) => {
      if (l.garage_id && g.id === l.garage_id) return true;
      if (l.emetteur && g.nom && l.emetteur.toLowerCase().trim() === g.nom.toLowerCase().trim()) return true;
      return false;
    });

    if (matchedGarage && matchedGarage.id) {
      const stats = garageVisits.get(matchedGarage.id) || { count: 0, lastDate: null, lastMileage: null };
      if (!l.document_source_id) {
        stats.count += 1;
      }
      if (l.date_intervention) {
        if (!stats.lastDate || new Date(l.date_intervention).getTime() > new Date(stats.lastDate).getTime()) {
          stats.lastDate = l.date_intervention;
          stats.lastMileage = l.kilometrage_intervention || stats.lastMileage;
        }
      }
      garageVisits.set(matchedGarage.id, stats);
    }
  });

  // Trouver le max des visites pour normalisation
  let maxVisits = 1;
  garageVisits.forEach((stats) => {
    if (stats.count > maxVisits) maxVisits = stats.count;
  });

  // 2. Calculer le score pondéré pour chaque garage
  const enrichedList: EnrichedGarage[] = garages.map((g) => {
    const gid = g.id || g.nom || 'unknown';
    const stats = garageVisits.get(gid) || { count: 0, lastDate: null, lastMileage: null };
    const visitCount = stats.count;
    const lastVisitDate = stats.lastDate;
    const lastVisitMileage = stats.lastMileage;

    const freqScore = calculateFrequencyScore(visitCount, maxVisits);
    const recencyScore = calculateRecencyScore(lastVisitDate);
    const isBrand = checkBrandAffinity(g.marque, g.nom, vehicle.marque);
    const brandScore = isBrand ? 100 : 0;

    // Score pondéré global
    const totalScore = Math.round(
      freqScore * weightFrequency +
      recencyScore * weightRecency +
      brandScore * weightBrand
    );

    // Formulation de la justification intelligible
    let reason = 'Atelier répertorié';
    if (visitCount > 1 && lastVisitDate) {
      const formattedDate = new Date(lastVisitDate).toLocaleDateString('fr-FR');
      reason = `Atelier habituel (${visitCount} interventions, dernière le ${formattedDate})`;
    } else if (visitCount === 1 && lastVisitDate) {
      const formattedDate = new Date(lastVisitDate).toLocaleDateString('fr-FR');
      reason = `Dernier atelier visité (le ${formattedDate})`;
    } else if (isBrand) {
      reason = `Réseau / Agréé officiel ${vehicle.marque || ''}`;
    }

    return {
      ...g,
      id: g.id || `g-${Math.random()}`,
      nom: g.nom || 'Atelier Professionnel',
      adresse: g.adresse || null,
      telephone: g.telephone || null,
      email: g.email || null,
      marque: g.marque || null,
      siret: g.siret || null,
      visitCount,
      lastVisitDate,
      lastVisitMileage,
      score: totalScore,
      reason,
      isBrandMatch: isBrand,
    };
  });

  // 3. Trier par score décroissant (puis date récente, puis nb de visites)
  enrichedList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.lastVisitDate && a.lastVisitDate) {
      return new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime();
    }
    return b.visitCount - a.visitCount;
  });

  const recommended = enrichedList.length > 0 ? enrichedList[0] : null;

  return {
    recommendedGarage: recommended,
    allGarages: enrichedList,
    explanation: recommended
      ? `${recommended.nom} est recommandé (${recommended.reason}).`
      : 'Aucun atelier recommandé.',
  };
}
