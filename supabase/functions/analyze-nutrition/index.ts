import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Tu es un expert mondial en nutrition sportive et diététique. 
Ton objectif est d'analyser la description d'un repas donnée par l'utilisateur et d'en estimer les macronutriments (protéines, glucides, lipides) et les calories totales.

Tu DOIS retourner UNIQUEMENT un objet JSON valide et rien d'autre (pas de markdown \`\`\`json, pas de texte d'explication).

La structure de l'objet JSON DOIT être EXACTEMENT celle-ci :
{
  "meal_name": "Nom court et descriptif du repas",
  "protein": nombre (en grammes),
  "carbs": nombre (en grammes),
  "fats": nombre (en grammes),
  "calories": nombre (en kcal),
  "is_exceptional_meal": boolean
}

Règles strictes :
- "protein", "carbs", "fats" et "calories" doivent être des nombres entiers.
- "is_exceptional_meal" : identifie si le repas est un écart / plaisir (true) ou un repas habituel / équilibré (false).
- PORTIONS PAR DÉFAUT (CRITIQUE) : Si le poids exact n'est pas précisé (ex: "2 tournedos", "du riz"), base-toi strictement sur des portions standards européennes moyennes (1 pièce de viande = 150g maximum, 1 portion de féculents = 200g cuits). Ne surestime JAMAIS les quantités sous prétexte que l'utilisateur est sportif.
- Ne rajoute AUCUN texte en dehors de l'objet JSON.`;

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Authenticate User (Security check)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        // 3. Get Payload
        const body = await req.json()
        const { text } = body

        if (!text || typeof text !== 'string') {
            throw new Error('Missing or invalid "text" in request body')
        }

        // 4. Call Gemini API
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured')
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

        const geminiPayload = {
            contents: [{
                parts: [{ text: SYSTEM_PROMPT + "\n\n" + text }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        }

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiPayload),
        })

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text()
            throw new Error(`Gemini API Error: ${errText}`)
        }

        const geminiData = await geminiResponse.json()

        let resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (!resultText) {
            throw new Error('Empty response from Gemini')
        }

        // 5. Parse and clean response
        let parsedResult;
        try {
            // Nettoyage agressif des balises Markdown éventuelles
            let cleanText = resultText.replace(/```json/gi, '').replace(/```/gi, '').trim();

            // Sécurité supplémentaire : on force l'extraction de l'objet JSON (entre { et })
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanText = jsonMatch[0];
            }

            parsedResult = JSON.parse(cleanText)
        } catch (e: any) {
            console.error("Parse error. Original text:", resultText);
            throw new Error(`Erreur de parsing JSON: ${e.message}. Texte reçu: ${resultText.substring(0, 100)}...`)
        }

        // 6. Return response
        return new Response(
            JSON.stringify(parsedResult),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('analyze-nutrition error:', error)

        let customMessage = error.message;
        if (error.message && error.message.includes('429') && error.message.includes('quota')) {
            customMessage = "Quota Google Gemini API dépassé. Veuillez vérifier la facturation sur Google AI Studio (limit: 0).";
        }

        return new Response(JSON.stringify({ error: customMessage || String(error) }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
