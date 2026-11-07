import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Classement de libellés bancaires par Gemini.
// Reçoit { labels: string[], categories: string[] } ; renvoie { results: [{ label, category, kind, confidence }] }.
// Seuls les libellés nettoyés sont envoyés : jamais de montant, d'IBAN ni de numéro de compte.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KINDS = ['depense', 'revenu', 'epargne', 'interne']
const MAX_LABELS = 150

const buildPrompt = (labels: string[], categories: string[]) => `Tu classes des libellés d'opérations bancaires françaises.
Catégories autorisées : ${categories.map((c) => `"${c}"`).join(', ')}.
Natures autorisées : "depense", "revenu", "epargne" (virement vers PEA, livret, assurance vie, courtier), "interne" (virement entre comptes de la même personne).

Pour chaque libellé, renvoie la catégorie la plus probable (ou null si aucune ne convient ou si ce n'est pas une dépense), la nature et une confiance entre 0 et 1.
Sois prudent : confiance basse si le libellé est ambigu.

Réponds UNIQUEMENT avec un objet JSON de la forme :
{ "results": [ { "label": "libellé tel que reçu", "category": "Courses" | null, "kind": "depense", "confidence": 0.8 } ] }

Libellés :
${labels.map((l, i) => `${i + 1}. ${l}`).join('\n')}`

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const body = await req.json()
        const labels: string[] = Array.isArray(body?.labels)
            ? [...new Set(body.labels.filter((l: unknown) => typeof l === 'string' && l.trim()).map((l: string) => l.trim().slice(0, 120)))].slice(0, MAX_LABELS) as string[]
            : []
        const categories: string[] = Array.isArray(body?.categories)
            ? body.categories.filter((c: unknown) => typeof c === 'string' && c.trim()).map((c: string) => c.trim())
            : []

        if (!labels.length) {
            return new Response(JSON.stringify({ results: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }
        if (!categories.length) throw new Error('Missing "categories" in request body')

        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured')

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: buildPrompt(labels, categories) }] }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0 },
            }),
        })

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text()
            throw new Error(`Gemini API Error: ${errText}`)
        }

        const geminiData = await geminiResponse.json()
        const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (!resultText) throw new Error('Empty response from Gemini')

        let cleanText = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim()
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
        if (jsonMatch) cleanText = jsonMatch[0]
        const parsed = JSON.parse(cleanText)

        // On ne garde que des réponses conformes, pour des libellés demandés
        const asked = new Set(labels)
        const allowed = new Map(categories.map((c) => [c.toLowerCase(), c]))
        const results = (Array.isArray(parsed?.results) ? parsed.results : [])
            .filter((r: any) => r && typeof r.label === 'string' && asked.has(r.label.trim()))
            .map((r: any) => {
                const category = typeof r.category === 'string' ? allowed.get(r.category.trim().toLowerCase()) ?? null : null
                const kind = KINDS.includes(r.kind) ? r.kind : 'depense'
                const confidence = Math.max(0, Math.min(1, Number(r.confidence) || 0))
                return { label: r.label.trim(), category: kind === 'depense' ? category : null, kind, confidence }
            })

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error: any) {
        console.error('categorize-transactions error:', error)
        return new Response(JSON.stringify({ error: error?.message || String(error) }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
