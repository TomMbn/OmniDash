import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StylistPayload {
  action: 'suggest_outfit' | 'analyze_gaps'
  weather?: string
  occasion?: string
  wardrobeData: any[]
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
    const payload: StylistPayload = await req.json()
    const { action, weather, occasion, wardrobeData } = payload

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    let systemPrompt = ""
    let userPrompt = ""

    if (action === 'suggest_outfit') {
      systemPrompt = `
        Tu es un styliste personnel expert, passionné par la mode et le conseil en image.
        Ton objectif est de créer une tenue complète, cohérente et élégante.
        
        RÈGLES STRICTES :
        1. Tu dois piocher EXCLUSIVEMENT dans les vêtements fournis dans le JSON 'wardrobeData'.
        2. Ne suggère aucun article qui n'existe pas dans la liste fournie.
        3. Propose une tenue complète (Haut, Bas, Chaussures, et Accessoires/Veste si pertinent).
        4. STRUCTURE DE LA RÉPONSE :
           - Utilise du Markdown (gras, listes à puces).
           - Si un vêtement suggéré possède un 'link', utilise-le dans le texte comme ceci : [Nom du vêtement](lien).
           - Ajoute une section "Conseil du Styliste" pour expliquer les choix (matières, harmonies).
        5. Sois direct, chic et professionnel.
      `.trim()
      
      userPrompt = `
        Occasion : ${occasion}
        Météo : ${weather}
        Ma garde-robe (wardrobeData) : ${JSON.stringify(wardrobeData)}
        
        Génère ma tenue idéale.
      `.trim()
    } else if (action === 'analyze_gaps') {
      systemPrompt = `
        Tu es un personal shopper expert en optimisation de garde-robe de luxe.
        
        CONTEXTE DU CLIENT :
        - Taille : 1m90 (attention cruciale aux longueurs de manches, de buste et de jambes).
        - Poids : 80kg.
        - Silhouette : En V (épaules larges, buste développé, taille plus fine).
        - Objectif : Analyse structurelle du placard (wardrobeData) et recommandations de 5 à 7 pièces pour maximiser l'élégance et la polyvalence.

        STRUCTURE DE LA RÉPONSE (Markdown) :
        
        1. "### 📊 Bilan Morpho-Stylistique"
           - Analyse de la cohérence de la garde-robe actuelle par rapport à la silhouette en V et à la stature de 1m90.
           - Identification des manques structurels (couleurs, textures, basiques).

        2. "### 🛍️ Recommandations d'Achats (5-7 pièces)"
           - Pour chaque pièce, fournis une fiche technique exhaustive :
             - **Pièce No X : [Nom précis de l'item]**
             - **Le Choix Idéal** : Coupe (ex: Tapered, Slim-straight), Matière (ex: Laine mérinos, Lin), Couleur (ex: Bleu marine profond).
             - **Alternatives (Fallbacks)** : [Coupe alternative], [Matière alternative], [Teinte alternative]. 
             - **Conseil Morpho** : Pourquoi cet item équilibre parfaitement une silhouette en V de 1m90.
             - **Mixage** : Avec quels 2-3 items du placard actuel l'associer.

        RÈGLES D'OR :
        - Sois TRÈS technique et précis (pas de généralités).
        - Ne donne PAS de justifications verbeuses (le "pourquoi" général). Concentre-toi sur la spécification.
        - Ton : Expert, autoritaire, luxueux.
      `.trim()
      
      userPrompt = `
        Placard actuel : ${JSON.stringify(wardrobeData)}
        
        Analyse mes manques et dresse mon bilan morpho-stylistique ainsi que mes 5 à 7 fiches techniques de recommandations.
      `.trim()
    } else {
      throw new Error('Action non supportée')
    }

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
          temperature: 0.7,
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse."

    return new Response(
      JSON.stringify({ result: resultText }),
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
