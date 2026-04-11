import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Types ──

interface TravelPayload {
  destination: string | null
  startDate: string
  endDate: string
  budget: number
  isAbroad?: boolean
  departureTime?: 'matin' | 'apres-midi' | 'soir'
  returnTime?: 'matin' | 'apres-midi' | 'soir'
}

interface GeminiContent {
  role: string
  parts: { text: string }[]
}

// ── Prompt builders ──

const SYSTEM_CONSTRAINTS = `
CONTRAINTES STRICTES À RESPECTER DANS TOUS LES CAS :
- Les estimations de transport doivent prendre en compte un départ depuis la région d'Angers/Trélazé en France. Les aéroports de relais logiques sont Nantes Atlantique (NTE) ou Paris (CDG/ORY). Inclus le trajet Angers → aéroport dans le coût transport.
- Exclus STRICTEMENT toute activité, visite ou recommandation de restauration liée à l'alcool : aucun bar, aucune dégustation de vins, aucun pub, aucune brasserie spécialisée, aucun bar à cocktails, aucun wine bar. Privilégie les cafés, salons de thé, pâtisseries, gastronomie locale, et activités culturelles.
- RÈGLE ANTI-BIAIS (Dietary) : L'exclusion de l'alcool est un choix de mode de vie personnel. N'en déduis AUCUNE restriction alimentaire religieuse. Ne propose pas spécifiquement de nourriture halal, casher ou autre, sauf mention explicite de l'utilisateur. Reste neutre et propose la gastronomie locale standard.
- Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte explicatif autour.
`.trim()

function buildSuggestionsPrompt(startDate: string, endDate: string, budget: number, isAbroad: boolean): GeminiContent[] {
  const geoRule = isAbroad
    ? '- RÈGLE GÉOGRAPHIQUE : Toutes les destinations suggérées doivent être STRICTEMENT en dehors de la France. Ne propose aucune ville ou région française.'
    : '- RÈGLE GÉOGRAPHIQUE : Toutes les destinations suggérées doivent être STRICTEMENT en France métropolitaine ou dans les territoires d\'outre-mer français. Ne propose aucune destination à l\'étranger.'

  const systemPrompt = `
Tu es un expert en voyages. L'utilisateur n'a pas de destination en tête.
Propose-lui 3 destinations de voyage adaptées à son budget et ses dates.

${SYSTEM_CONSTRAINTS}
${geoRule}

Le format JSON attendu est :
{
  "suggestions": [
    {
      "name": "Nom de la ville/pays",
      "emoji": "emoji drapeau ou lieu",
      "budget_estime": 1200,
      "tagline": "Résumé de l'ambiance en une phrase courte et inspirante",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

Règles pour les suggestions :
- Les 3 destinations doivent être réalistes pour le budget donné (transport depuis Angers inclus).
- Varie les types de voyages (city trip, nature, plage, culture…).
- Le budget_estime doit être cohérent et inférieur ou égal au budget demandé.
- Les tags doivent refléter l'ambiance (3 maximum par destination).
`.trim()

  const userPrompt = `
Dates : du ${startDate} au ${endDate}
Budget total : ${budget} €
Propose-moi 3 destinations.
`.trim()

  return [
    { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
  ]
}

function buildTimingRules(departureTime: string, returnTime: string, nbDays: number): string {
  const SLOT_LABELS: Record<string, string[]> = {
    'matin': [],
    'apres-midi': ['matin'],
    'soir': ['matin', 'midi'],
  }

  const RETURN_BLOCKED: Record<string, string[]> = {
    'matin': ['midi', 'apres_midi', 'soir'],
    'apres-midi': ['soir'],
    'soir': [],
  }

  const lines: string[] = []

  const blockedFirst = SLOT_LABELS[departureTime] || []
  if (blockedFirst.length > 0) {
    lines.push(`- JOUR 1 (arrivée le ${departureTime}) : Les créneaux ${blockedFirst.map(s => `"${s}"`).join(', ')} doivent indiquer "🚆 Trajet" car le voyageur n'est pas encore arrivé. Ne propose AUCUNE activité touristique ni restaurant pour ces créneaux.`)
  }

  const blockedLast = RETURN_BLOCKED[returnTime] || []
  if (blockedLast.length > 0) {
    lines.push(`- JOUR ${nbDays} (retour le ${returnTime}) : Les créneaux ${blockedLast.map(s => `"${s}"`).join(', ')} doivent indiquer "🚆 Trajet retour" car le voyageur repart. Ne propose AUCUNE activité touristique ni restaurant pour ces créneaux.`)
  }

  return lines.length > 0
    ? '\nRÈGLES DE TIMING (PREMIER / DERNIER JOUR) :\n' + lines.join('\n')
    : ''
}

function buildPlannerPrompt(
  destination: string,
  startDate: string,
  endDate: string,
  budget: number,
  departureTime: string,
  returnTime: string
): GeminiContent[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const nbDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  const timingRules = buildTimingRules(departureTime, returnTime, nbDays)

  const systemPrompt = `
Tu es un planificateur de voyages expert. Crée un itinéraire détaillé jour par jour et une répartition budgétaire réaliste.

${SYSTEM_CONSTRAINTS}

RÈGLE DE COMPTAGE DES JOURS :
- Le calcul est INCLUSIF : du 08/05 au 10/05 = 3 jours d'itinéraire (jour 1 = 08, jour 2 = 09, jour 3 = 10). Tu DOIS générer exactement ${nbDays} jours.
${timingRules}

Le format JSON attendu est :
{
  "budget_breakdown": {
    "transport": <number>,
    "logement": <number>,
    "nourriture": <number>,
    "activites": <number>
  },
  "itinerary": [
    {
      "jour": 1,
      "date": "lun. 15 mars",
      "titre": "Titre court du jour",
      "matin": "Description de l'activité du matin",
      "midi": "Recommandation repas du midi (restaurant ou type de cuisine)",
      "apres_midi": "Description de l'activité de l'après-midi",
      "soir": "Description de l'activité/repas du soir"
    }
  ]
}

Règles :
- La somme de budget_breakdown doit être exactement égale au budget total demandé (${budget} €).
- Le transport inclut le trajet Angers → aéroport (Nantes ou Paris) + vol + transports locaux.
- L'itinéraire doit avoir EXACTEMENT ${nbDays} jour(s) (calcul inclusif).
- Chaque créneau (matin, midi, apres_midi, soir) doit être une phrase concise (max 100 caractères).
- Le premier jour doit inclure le voyage aller et le dernier jour le voyage retour.
- Les activités doivent être adaptées à ${destination} et réalistes.
`.trim()

  const userPrompt = `
Destination : ${destination}
Dates : du ${startDate} au ${endDate} (${nbDays} jours, calcul inclusif)
Départ le : ${departureTime} | Retour le : ${returnTime}
Budget total : ${budget} €
Génère l'itinéraire complet et la répartition budgétaire.
`.trim()

  return [
    { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
  ]
}

// ── Gemini API call ──

async function callGemini(contents: GeminiContent[]): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`)
  }

  const data = await response.json()

  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('Empty response from Gemini')
  }

  // Parse le JSON (supporte les backticks markdown éventuels)
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${cleaned.substring(0, 200)}`)
  }
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: TravelPayload = await req.json()

    const {
      destination,
      startDate,
      endDate,
      budget,
      isAbroad = true,
      departureTime = 'matin',
      returnTime = 'matin'
    } = payload

    // Validation minimale
    if (!startDate || !endDate || !budget || budget <= 0) {
      return new Response(
        JSON.stringify({ error: 'startDate, endDate et budget sont obligatoires.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const hasDestination = destination && destination.trim().length > 0

    const contents = hasDestination
      ? buildPlannerPrompt(destination.trim(), startDate, endDate, budget, departureTime, returnTime)
      : buildSuggestionsPrompt(startDate, endDate, budget, isAbroad)

    const result = await callGemini(contents)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
