import { NextResponse } from 'next/server';
import { getAllMaintenanceData } from '@/lib/maintenance/maintenance-data';

export async function GET() {
  const allVehicles = getAllMaintenanceData();

  const vehiclesSection = allVehicles
    .map((v) => {
      const intervalsList = v.intervals
        .map(
          (i) =>
            `  - ${i.operation}: Tous les ${i.intervalKm.toLocaleString('fr-FR')} km ou ${i.intervalMonths / 12} an(s). Coût estimé : ${i.estimatedCostMin}-${i.estimatedCostMax} EUR. Criticité : ${i.criticality}.`
        )
        .join('\n');

      const vulnerabilitiesList = v.vulnerabilities
        .map(
          (vuln) =>
            `  - ${vuln.title} (${vuln.component}): ${vuln.description} Action préventive : ${vuln.preventiveAction}`
        )
        .join('\n');

      return `## ${v.brand} ${v.model} - ${v.engine}
- Années de production : ${v.productionYears}
- Code moteur : ${v.engineCode}
- Type de carburant : ${v.fuelType} (${v.powerHp} ch)
- Huile préconisée : ${v.recommendedOilNorm} (Viscosité ${v.oilViscosity})

### Synthèse constructeur :
${v.directAnswerSummary}

### Calendrier d'entretien officiel :
${intervalsList}

### Alertes fiabilité et vulnérabilités mécaniques :
${vulnerabilitiesList}

### URL Canonique :
https://www.lavigieauto.com/entretien/${v.brandSlug}/${v.modelSlug}/${v.engineSlug}
`;
    })
    .join('\n---\n\n');

  const header = `# LaVigieAuto Knowledge Base - Plans d'Entretien Constructeur & Normes Techniques

> Base de connaissances certifiée et barèmes d'entretien automobile multi-constructeurs pour agents IA (Perplexity, SearchGPT, Gemini).

`;

  const fullContent = `${header}${vehiclesSection}`;

  return new NextResponse(fullContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
