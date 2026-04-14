import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SmartAddPayload {
  rawInput: string
  link?: string
}

interface GeminiContent {
  role: string
  parts: { text: string }[]
}

serve(async (req) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: SmartAddPayload = await req.json()
    const { rawInput, link } = payload

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const systemPrompt = `
      Tu es un expert en mode et un classificateur de base de données. 
      L'utilisateur te donne une description brute d'un vêtement. 
      Tu dois extraire et déduire ses caractéristiques pour remplir une base de données.
      
      Renvoie UNIQUEMENT un objet JSON valide avec ces clés exactes :
      - name (Donne-lui un nom propre et formaté, ex: "Pull en laine rouge")
      - category (Choisis strictement parmi : haut, bas, chaussures, veste, accessoire)
      - sub_category (Déduis le type précis : T-shirt, Pull, Chemise, Jean, Chino, Sweat, Sneakers, Bottes, etc.)
      - color (La couleur déduite)
      - quantity (Le nombre de vêtements, extrais-le si mentionné, ex: "3 tee-shirts" -> 3. Sinon mets 1)
      - style (Choisis parmi : casual, sport, habillé, chill)
      - season (Choisis parmi : été, hivers, mi-saison, toutes)
      - brand (Si mentionnée dans le texte, sinon null)
      - description (Génère une très courte description de la matière/coupe si tu peux la déduire)
      
      RÈGLES : 
      - Réponds UNIQUEMENT avec le JSON, pas de texte avant ou après.
      - Si tu ne sais pas, mets "Inconnu" pour les chaînes de caractères et null pour brand.
    `.trim()

    const userPrompt = `Description : "${rawInput}"${link ? `\nLien : ${link}` : ''}`

    const model = 'gemini-2.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const contents: GeminiContent[] = [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
    ]

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      throw new Error("L'IA n'a pas renvoyé de résultat.")
    }

    // Clean JSON string just in case
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    return new Response(
      cleaned,
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
