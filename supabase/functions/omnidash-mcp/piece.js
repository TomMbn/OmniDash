// Ne laisse sortir de la base que les champs prévus. Les autres colonnes,
// dont user_id, restent dans la fonction.

export function toPiece(row) {
  return {
    id: String(row.id),
    nom: row.name,
    categorie: String(row.category ?? '').toLowerCase(),
    sousCategorie: row.sub_category ?? null,
    couleur: row.color ?? null,
    marque: row.brand ?? null,
    quantite: row.quantity ?? 1,
    style: row.style ?? null,
    lien: row.link?.startsWith('https://') ? row.link : null
  }
}
