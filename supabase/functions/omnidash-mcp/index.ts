// Connecteur OmniDash : serveur MCP en lecture seule.
//
// Seule fonction qui accepte les jetons OAuth, elle n'appelle donc pas
// refuseOAuthClient. La vérification de la passerelle est désactivée :
// withSupabase({ auth: 'user' }) contrôle ici la signature du jeton avec les
// clés publiques (JWKS) du projet, son expiration et la présence de sub.
// Sans jeton valide, la réponse est un refus et aucun outil n'est atteint.
// Seules les métadonnées OAuth et les requêtes OPTIONS passent sans jeton.
//
// La lecture se fait avec le jeton de l'utilisateur, sous les règles de
// sécurité par ligne. La clé secrète n'est jamais utilisée.
//
// Ne rien journaliser du dressing ni des jetons.

import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@2.4.0'
import { pipeline } from 'npm:@supabase/middleware@1.0.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.9.2'

import { toPiece } from './piece.js'

Deno.serve(
  pipeline(
    // Dans cet ordre : la découverte OAuth répond avant le contrôle du jeton.
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    (req, { supabase, userClaims }) => {
      // Un serveur neuf par requête, lié à l'utilisateur de cette requête.
      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'OmniDash', version: '1.0.0' })

        server.registerTool(
          'lire_dressing',
          {
            title: 'Lire le dressing',
            description: "Liste toutes les pièces du dressing de l'utilisateur connecté.",
            annotations: { readOnlyHint: true }
          },
          async () => {
            const { data, error } = await supabase
              .from('wardrobe')
              .select('*')
              .eq('user_id', userClaims!.id)
            // Le message d'un outil en échec part chez le client : rien de la base.
            if (error) throw new Error('Lecture du dressing impossible.')
            return { content: [{ type: 'text' as const, text: JSON.stringify({ pieces: data.map(toPiece) }) }] }
          }
        )

        return server
      })

      return handler.fetch(req)
    }
  )
)
