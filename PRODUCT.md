# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Une seule personne : Tom, qui construit l'app pour lui-même. Pas d'équipe, pas de client, pas d'inscription publique.

Trois moments d'usage confirmés :

- à la salle, téléphone en main entre deux séries ;
- en journée, pour saisir un repas ou l'eau, ou consulter un point précis ;
- le soir sur desktop, pour regarder les tendances et préparer la suite.

## Product Purpose

Réunir en un seul endroit tout ce qui compose la vie quotidienne de Tom : entraînement, nutrition, sommeil, voyages, dressing et confort de la maison. Le succès, c'est de ne plus avoir besoin d'une app par sujet.

## Positioning

Tout en un seul endroit, fait pour une seule personne. Aucune app de muscu, de santé ou de voyage ne croise ces sujets, parce qu'aucune ne connaît le programme, le sommeil, les fenêtres et le placard du même utilisateur.

## Operating Context

- PWA installée sur téléphone, sidebar sur desktop.
- Programme d'entraînement sur 8 semaines : Push, Pull, Legs, Upper, Lower, Cardio, avec des semaines décalées par les jours de match.
- Progression par double progression : statuts START, PROGRESS, CONSOLIDATE, INCREASE.
- Sommeil synchronisé depuis Withings Sleep Analyzer, poids depuis Withings.
- Température et humidité intérieures depuis une station Netatmo, notifications push pour ouvrir ou fermer les fenêtres.

## Capabilities and Constraints

Modules : Dashboard, Musculation, Nutrition, Sommeil, Travel, Dressing, Plan, Fenêtres.

Stack : Vue 3, Vite, Tailwind v3, Supabase, Chart.js, Lucide.

Données réellement disponibles pour le sommeil : score, durée, sommeil profond, sommeil paradoxal. Le découpage minute par minute de la nuit n'est pas stocké.

L'analyse de repas, le styliste et le planificateur de voyage passent par des fonctions IA.

## Brand Commitments

Le nom OmniDash reste. Aucune contrainte sur le thème, les couleurs ou la typographie : l'identité actuelle peut être entièrement remplacée.

L'interface est en français.
