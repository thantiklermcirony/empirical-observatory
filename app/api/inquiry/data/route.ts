import { dataCatalogue, searchIndicators } from '@/lib/world-bank';
import { labError, labJson, PUBLIC_HEADERS } from '@/lib/lab-http';
export function OPTIONS() { return new Response(null, { status: 204, headers: PUBLIC_HEADERS }); }
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get('q') ?? '';
    if (query.length > 150) return labJson({ error: 'Use a shorter statistic name.' }, 400);
    const catalogue = await dataCatalogue();
    return labJson({ provider: 'World Bank WDI', catalogueSize: catalogue.indicators.length, indicators: searchIndicators(catalogue.indicators, query), countries: catalogue.countries.map(c => ({ id: c.id, name: c.name })), source: 'https://api.worldbank.org/v2/indicator?source=2&format=json&per_page=3000', metadataCacheMaxSeconds: 3600 });
  } catch (error) { return labError(error); }
}
