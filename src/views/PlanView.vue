<template>
  <div class="plan-view">
    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Plan,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">programme 8 semaines</span>
      </h1>
    </header>

    <section class="banner" aria-label="Semaine type">
      <span class="orb orb--a" aria-hidden="true" />
      <span class="orb orb--b" aria-hidden="true" />
      <h2 class="banner-title">
        Semaine type,<br />
        <span class="banner-title-soft">5 séances, 2 cardio</span>
      </h2>
    </section>

    <!-- ── Onglets ── -->
    <div class="tabs-bar" role="tablist" aria-label="Sections du plan">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        role="tab"
        :aria-selected="activeTab === tab.id"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- PLAN SEMAINE -->
    <div v-show="activeTab === 'semaine'" class="tab-panel">
      <div class="week-grid">
        <div
          v-for="day in weekDays"
          :key="day.name"
          class="card day-card"
          :class="{ 'day-card--today': day.name === todayName }"
        >
          <div class="day-label">{{ day.name }}</div>
          <div class="day-title">{{ day.title }}</div>
          <div class="day-sub">{{ day.sub }}</div>
          <div class="badges">
            <span v-for="badge in day.badges" :key="badge.text" class="badge" :style="badge.style">{{ badge.text }}</span>
          </div>
          <div v-if="day.note" class="day-note">{{ day.note }}</div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">Séances salle</div>
          <div class="stat-val">5</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Sessions cardio</div>
          <div class="stat-val">2</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Sessions abdos</div>
          <div class="stat-val">3</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Vacuum + étirements</div>
          <div class="stat-val">7j/7</div>
        </div>
      </div>

      <div class="tip">Cardio lundi & vendredi = récupération active jambes après Legs jeudi et Lower dimanche · FC cible 110–130 bpm · Ne jamais dépasser 140 bpm · Piloter par la FC, pas par la vitesse.</div>
    </div>

    <!-- MUSCULATION -->
    <div v-show="activeTab === 'muscu'" class="tab-panel">
      <div class="tip">Repos : 2–3 min sur poly-articulaires lourds · 90 s sur isolation standard · 60 s sur élévations latérales · 45 s sur face pulls · 30 s entre les drop sets et rest-pause.</div>

      <div v-for="session in muscuSessions" :key="session.day" class="card">
        <div class="day-header">
          <span class="day-pill" :style="session.pillStyle">{{ session.day }}</span>
          <span class="session-title">{{ session.title }}</span>
        </div>
        <div class="col-header">
          <span class="col-label col-label--left">Exercice</span>
          <span class="col-label">Séries × reps</span>
          <span class="col-label">Repos</span>
        </div>
        <template v-for="item in session.items" :key="item.name || item.sep">
          <div v-if="item.sep" class="sep">{{ item.sep }}</div>
          <div v-else class="ex-row">
            <span class="ex-name">
              {{ item.name }}
              <span v-if="item.badge" class="badge new-b">{{ item.badge }}</span>
              <div v-if="item.note" class="ex-note">{{ item.note }}</div>
            </span>
            <span class="ex-sets">{{ item.sets }}</span>
            <span class="ex-rest">{{ item.rest }}</span>
          </div>
        </template>
      </div>

      <div class="tip">Double progression : atteins la limite haute de la plage en reps → monte de 2,5 kg → recommence à la limite basse. Décharge toutes les 6–8 semaines.</div>

      <!-- SEMAINE DE DÉCHARGE -->
      <div class="decharge-section">
        <div class="decharge-title">Semaine de décharge</div>
        <div class="decharge-sub">Mêmes charges · mêmes reps · −1 série par exercice · arrêter 2–3 reps avant l'échec. Durée : 1 semaine toutes les 6–8 semaines.</div>

        <div v-for="session in dechargeBlocs" :key="session.day" class="card card--decharge">
          <div class="day-header">
            <span class="day-pill" :style="session.pillStyle">{{ session.day }}</span>
            <span class="session-title">{{ session.title }}</span>
            <span class="decharge-count">{{ session.totalNormal }} → {{ session.totalDecharge }} séries</span>
          </div>
          <div class="col-header">
            <span class="col-label col-label--left">Exercice</span>
            <span class="col-label">Normal</span>
            <span class="col-label">Décharge</span>
          </div>
          <div v-for="ex in session.exercises" :key="ex.name" class="ex-row">
            <span class="ex-name">{{ ex.name }}</span>
            <span class="ex-sets ex-sets--strikethrough">{{ ex.normal }}</span>
            <span class="ex-sets ex-sets--accent">{{ ex.decharge }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CARDIO -->
    <div v-show="activeTab === 'cardio'" class="tab-panel">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">Séances/semaine</div>
          <div class="stat-val">2</div>
          <div class="stat-label">lundi + vendredi</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Durée cible</div>
          <div class="stat-val stat-val--sm">35–40 min</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">FC zone 2</div>
          <div class="stat-val stat-val--sm">120–140 bpm</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Dépense estimée</div>
          <div class="stat-val">~500 kcal</div>
          <div class="stat-label">par semaine</div>
        </div>
      </div>

      <div class="card card--accent-blue">
        <div class="day-header">
          <span class="badge" style="background:var(--module-sleep-dim);color:var(--module-sleep);">Phase 1 — sem. 1 à 6</span>
          <span class="session-title">2 × LISS zone 2</span>
        </div>
        <div class="ex-row single"><span class="ex-name">Vélo résistance modérée · 120–140 bpm · parler sans être essoufflé<div class="ex-note">35–40 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Marche rapide / nordic walking · 6–7 km/h<div class="ex-note">40–50 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Rowing ergomètre (si dispo) <span class="badge new-b">Recommandé longiligne</span><div class="ex-note">30–35 min · bras longs = avantage mécanique</div></span></div>
        <div class="tip">Semaine 6 : même FC à intensité plus élevée = base aérobie qui progresse → passer en phase 2.</div>
      </div>

      <div class="card">
        <div class="day-header">
          <span class="badge" style="background:var(--accent-dim);color:var(--accent);">Phase 2 — sem. 7+</span>
          <span class="session-title">1 × LISS + 1 × Zone 3–4</span>
        </div>
        <div class="ex-row single"><span class="ex-name">LISS zone 2 — lundi · conservé comme base<div class="ex-note">35 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Zone 3–4 — vendredi · vélo tempo ou rowing · FC 155–170 bpm<div class="ex-note">25–30 min · ou sprints tabata : 20 s effort / 40 s récup × 10 rounds</div></span></div>
        <div class="tip">Jamais zone 3–4 la veille d'une séance lourde. Jamais avant 6 semaines de LISS.</div>
      </div>
    </div>

    <!-- ABDOS & POSTURE -->
    <div v-show="activeTab === 'abdos'" class="tab-panel">
      <div class="section-intro">3x/semaine · lundi, mercredi, vendredi · ~18 min · aucun matériel. Vacuum + routine posturale quotidiens 7j/7.</div>

      <div v-for="bloc in abdosBlocs" :key="bloc.title" class="card">
        <div class="day-header">
          <span class="day-pill" :style="bloc.pillStyle">{{ bloc.title }}</span>
          <span v-if="bloc.sub" class="bloc-sub">{{ bloc.sub }}</span>
        </div>
        <div class="col-header">
          <span class="col-label col-label--left">Exercice</span>
          <span class="col-label">{{ bloc.colLabel || 'Séries × reps' }}</span>
          <span class="col-label">Repos</span>
        </div>
        <div v-for="ex in bloc.exercises" :key="ex.name" class="ex-row">
          <span class="ex-name">
            {{ ex.name }}
            <span v-if="ex.badge" class="badge new-b">{{ ex.badge }}</span>
            <div v-if="ex.note" class="ex-note">{{ ex.note }}</div>
          </span>
          <span class="ex-sets">{{ ex.sets }}</span>
          <span class="ex-rest">{{ ex.rest }}</span>
        </div>
      </div>
    </div>

    <!-- PHASES -->
    <div v-show="activeTab === 'phases'" class="tab-panel">
      <div v-for="phase in phases" :key="phase.weeks" class="card">
        <div class="day-header">
          <span class="day-pill" :style="phase.pillStyle">{{ phase.weeks }}</span>
          <span class="session-title">{{ phase.title }}</span>
        </div>
        <div v-for="row in phase.rows" :key="row.text" class="phase-row">
          <span class="phase-dot" :style="{ background: row.color }"></span>
          <span>{{ row.text }}</span>
        </div>
      </div>
    </div>

    <!-- NUTRITION -->
    <div v-show="activeTab === 'nutri'" class="tab-panel">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">Calories cible</div>
          <div class="stat-val stat-val--sm">3 000–3 100</div>
          <div class="stat-label">kcal/jour · maintenance</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Protéines</div>
          <div class="stat-val stat-val--sm">160–165 g</div>
          <div class="stat-label">2 g/kg · priorité absolue</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Lipides min.</div>
          <div class="stat-val stat-val--sm">80–90 g</div>
          <div class="stat-label">1 g/kg · hormones</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Glucides</div>
          <div class="stat-val">Libre</div>
          <div class="stat-label">Complète le reste</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Timing journée type (jour de salle)</div>
        <div v-for="meal in mealtiming" :key="meal.time" class="ex-row ex-row--timing">
          <span class="ex-name">{{ meal.label }}<div v-if="meal.note" class="ex-note">{{ meal.note }}</div></span>
          <span class="ex-sets">{{ meal.time }}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Règles de suivi</div>
        <div v-for="rule in nutritionRules" :key="rule.text" class="ex-row ex-row--single">
          <span class="ex-name">{{ rule.text }}<div v-if="rule.note" class="ex-note">{{ rule.note }}</div></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const todayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
  .format(new Date())
  .replace(/^./, letter => letter.toUpperCase())

const activeTab = ref('semaine')

const tabs = [
  { id: 'semaine', label: 'Plan semaine' },
  { id: 'muscu', label: 'Musculation' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'abdos', label: 'Abdos & posture' },
  { id: 'phases', label: 'Phases 8 sem.' },
  { id: 'nutri', label: 'Nutrition' }
]

const weekDays = [
  {
    name: 'Lundi',
    title: 'LISS + Abdos',
    sub: 'Cardio zone 2 · Core & posture',
    badges: [
      { text: 'Cardio 35 min', style: 'background:var(--module-nutri-dim);color:var(--module-nutri);' },
      { text: 'Abdos & antéversion', style: 'background:var(--accent-dim);color:var(--accent);' }
    ]
  },
  {
    name: 'Mardi',
    title: 'Push',
    sub: 'Pecs · Épaules · Triceps',
    badges: [{ text: 'Salle · ~55 min', style: 'background:var(--module-sleep-dim);color:var(--module-sleep);' }]
  },
  {
    name: 'Mercredi',
    title: 'Pull + Abdos',
    sub: 'Dos · Biceps · Core',
    badges: [
      { text: 'Salle · ~60 min', style: 'background:var(--module-sleep-dim);color:var(--module-sleep);' },
      { text: 'Abdos maison soir', style: 'background:var(--accent-dim);color:var(--accent);' }
    ]
  },
  {
    name: 'Jeudi',
    title: 'Legs',
    sub: 'Quads · Ischios · Épaules',
    badges: [{ text: 'Salle · ~60 min', style: 'background:var(--accent-dim);color:var(--accent);' }]
  },
  {
    name: 'Vendredi',
    title: 'LISS + Abdos',
    sub: 'Cardio zone 2 · Core',
    badges: [
      { text: 'Cardio 35 min', style: 'background:var(--module-nutri-dim);color:var(--module-nutri);' },
      { text: 'Abdos maison', style: 'background:var(--accent-dim);color:var(--accent);' }
    ]
  },
  {
    name: 'Samedi',
    title: 'Upper',
    sub: 'Grand dorsal · Épaules · Bras',
    badges: [{ text: 'Salle · ~60 min', style: 'background:var(--module-dress-dim);color:var(--module-dress);' }]
  },
  {
    name: 'Dimanche',
    title: 'Lower',
    sub: 'Ischios · Fessiers · Core',
    badges: [{ text: 'Salle · ~55 min', style: 'background:var(--module-nutri-dim);color:var(--module-nutri);' }],
    note: 'SDT roumain en 4e position'
  }
]

const muscuSessions = [
  {
    day: 'Mardi',
    pillStyle: 'background:var(--module-sleep-dim);color:var(--module-sleep);',
    title: 'Push — Pecs, Épaules & Triceps',
    items: [
      { sep: 'Pectoraux' },
      { name: 'Chest press incliné machine', note: 'Focus haut du pec · double progression prioritaire', sets: '3 × 8-10', rest: '2–3 min' },
      { name: 'Chest fly machine', note: 'Focus étirement · contraction 1 s en haut', sets: '3 × 12-15', rest: '90 s' },
      { sep: 'Triceps' },
      { name: 'Extension triceps poulie basse', sets: '3 × 12-15', rest: '90 s' },
      { name: 'Extension triceps poulie haute', sets: '3 × 12-15', rest: '90 s' },
      { sep: 'Épaules en finition' },
      { name: 'Élévations latérales haltères', note: 'Focus galbe · excentrique 4 s · rest-pause sur série 4', sets: '4 × 15', rest: '60 s' }
    ]
  },
  {
    day: 'Mercredi',
    pillStyle: 'background:var(--module-sleep-dim);color:var(--module-sleep);',
    title: 'Pull — Dos & Biceps',
    items: [
      { sep: 'Grand dorsal — largeur prioritaire' },
      { name: 'Lat pulldown', badge: 'Priorité V-taper', note: 'Focus galbe · amplitude maximale · étirer le grand dorsal en haut', sets: '4 × 8-10', rest: '2–3 min' },
      { sep: 'Épaisseur du dos' },
      { name: 'Mid row machine', note: 'Focus épaisseur', sets: '3 × 8-10', rest: '2 min' },
      { name: 'Tirage horizontal V-grip', note: 'Focus tirage horizontal', sets: '3 × 10-12', rest: '90 s' },
      { sep: 'Épaules postérieures & biceps' },
      { name: 'Face pulls / oiseau poulie', note: 'Focus arrière épaule · correction protraction', sets: '3 × 15', rest: '45 s' },
      { name: 'Curl pupitre haltères', note: 'Focus étirement biceps', sets: '3 × 10-12', rest: '90 s' },
      { name: 'Curl marteau haltères', note: 'Focus brachial', sets: '3 × 12', rest: '60 s' }
    ]
  },
  {
    day: 'Jeudi',
    pillStyle: 'background:var(--accent-dim);color:var(--accent);',
    title: 'Legs — Focus Quadriceps',
    items: [
      { sep: 'Quadriceps' },
      { name: 'Presse pieds bas', note: 'Focus quads · surveiller adducteurs', sets: '3 × 10-12', rest: '2 min' },
      { name: 'Presse unilatérale', badge: 'Nouveau', note: 'Par jambe · surveiller adducteurs', sets: '3 × 10-12', rest: '2 min' },
      { name: 'Leg extension', note: 'Contraction 2 s en haut', sets: '3 × 15', rest: '60 s' },
      { sep: 'Ischios & Mollets' },
      { name: 'Leg curl allongé', note: 'Maintenance ischios', sets: '4–5 × 12-15', rest: '90 s' },
      { name: 'Mollets debout', note: 'Noter la charge à chaque séance', sets: '4 × 15', rest: '60 s' },
      { sep: 'Épaules en finition — muscles frais relatifs' },
      { name: 'Élévations latérales haltères', note: 'Focus galbe · excentrique 4 s · drop set sur dernière série', sets: '4 × 15', rest: '60 s' },
      { name: 'Face pulls / oiseau poulie', note: 'Focus arrière épaule · deltoïde postérieur', sets: '4 × 15', rest: '45 s' }
    ]
  },
  {
    day: 'Samedi',
    pillStyle: 'background:var(--module-dress-dim);color:var(--module-dress);',
    title: 'Upper — Largeur & V-Taper',
    items: [
      { name: 'Chest press machine', sets: '3 × 8-10', rest: '2 min' },
      { name: 'Tirage vertical unilatéral poulie haute', badge: 'Nouveau', note: 'Focus grand dorsal', sets: '3 × 10-12', rest: '90 s' },
      { name: 'Machine fly pec deck', badge: 'Nouveau', sets: '3 × 12', rest: '90 s' },
      { name: 'Pull-over poulie haute', note: 'Focus largeur grand dorsal', sets: '3 × 12-15', rest: '90 s' },
      { sep: 'Deltoïdes — priorité morphologique' },
      { name: 'Élévations latérales poulie', note: '1,5 reps séries 1–2 · excentrique 4 s séries 3–4 · drop set série 5', sets: '4 × 15', rest: '60 s' },
      { sep: 'Prévention & finition' },
      { name: 'Superset : curl + extension triceps', note: 'Enchaîner sans repos entre les deux exercices', sets: '3 × 12', rest: '60 s' },
      { name: 'Face pulls / oiseau poulie', note: 'Focus arrière épaule', sets: '3 × 15', rest: '45 s' }
    ]
  },
  {
    day: 'Dimanche',
    pillStyle: 'background:var(--module-nutri-dim);color:var(--module-nutri);',
    title: 'Lower — Ischios, Fessiers & Abdos',
    items: [
      { sep: 'Chaîne postérieure' },
      { name: 'Leg curl allongé machine', sets: '3 × 12-15', rest: '90 s' },
      { name: 'Hip thrust machine', note: 'Antagoniste du psoas · clé antéversion', sets: '3 × 12', rest: '90 s' },
      { name: 'SDT roumain haltères', note: 'Focus ischios · noter la charge systématiquement', sets: '3 × 10-12', rest: '2–3 min' },
      { name: 'Presse pieds bas', note: 'Surveiller adducteurs', sets: '3 × 10-12', rest: '2 min' },
      { sep: 'Abdos en salle' },
      { name: 'Relevés de jambes suspendu', note: 'Poids de corps · bas du ventre · V-line', sets: '3 × 15', rest: '45 s' }
    ]
  }
]

const abdosBlocs = [
  {
    title: 'Routine A — Core & V-line',
    sub: 'Lundi & vendredi · ~12 min',
    pillStyle: 'background:var(--module-nutri-dim);color:var(--module-nutri);',
    exercises: [
      { name: 'Vacuum abdominal', note: "Expire tout l'air · nombril vers la colonne · transverse profond", sets: '3 × 30-45 s', rest: '30 s' },
      { name: 'Dead bug', note: 'Allongé · bras vers plafond · genoux à 90° · descendre bras droit + jambe gauche en expirant · bas du dos plaqué au sol en permanence', sets: '3 × 8-10/côté', rest: '30 s' },
      { name: 'Relevés de jambes tendues', note: 'Mains sous les fessiers · descente 3 s · jambes fléchies si trop difficile', sets: '3 × 12-15', rest: '45 s' },
      { name: 'Planche latérale', note: 'Progression : ajouter dip latéral · flancs et obliques', sets: '3 × 25-35 s/côté', rest: '30 s' }
    ]
  },
  {
    title: 'Routine B — Posture & antéversion',
    sub: 'Mercredi · ~12 min',
    pillStyle: 'background:var(--module-sleep-dim);color:var(--module-sleep);',
    exercises: [
      { name: 'Vacuum abdominal', note: "Expire tout l'air · nombril vers la colonne", sets: '3 × 30-45 s', rest: '30 s' },
      { name: 'Rétroversion active du bassin', note: 'Allongé sur le dos · aplatir le bas du dos contre le sol · contracter abdos + fessiers · tenir 5 s', sets: '3 × 15 reps', rest: '20 s' },
      { name: 'Pont fessier (glute bridge)', note: "Monter le bassin · contracter fessiers · tenir 2 s en haut · bas du dos ne cambre pas", sets: '3 × 15 reps', rest: '30 s' },
      { name: 'Dead bug', note: 'Bas du dos plaqué au sol en permanence · mouvement lent et contrôlé', sets: '3 × 8-10/côté', rest: '30 s' }
    ]
  },
  {
    title: 'Quotidien — 7j/7',
    sub: 'Vacuum matin + Étirements soir · ~6 min',
    pillStyle: 'background:var(--bg-overlay);color:var(--text-secondary);',
    colLabel: 'Séries × durée',
    exercises: [
      { name: 'Vacuum abdominal debout', badge: 'Matin à jeun', note: "Pieds dans l'axe des épaules · légèrement penché en avant · expiration maximale · nombril vers la colonne", sets: '3 × 30 s', rest: '20 s' },
      { name: 'Étirement psoas en fente basse', badge: 'Soir', note: 'Genou arrière au sol · rétroversion du bassin pendant l\'étirement · dos droit', sets: '45–60 s/côté', rest: '—' },
      { name: 'Étirement droit fémoral', badge: 'Soir', note: 'Allongé sur le ventre ou debout · talon vers fessier · contracter légèrement le fessier', sets: '45 s/côté', rest: '—' },
      { name: 'Position enfant — lombaires', badge: 'Soir', note: 'Assis sur les talons · bras tendus devant · front au sol', sets: '60 s', rest: '—' }
    ]
  }
]

const phases = [
  {
    weeks: 'Semaines 1–2',
    pillStyle: 'background:var(--module-sleep-dim);color:var(--module-sleep);',
    title: 'Mise en place',
    rows: [
      { color: 'var(--module-sleep)', text: 'Musculation : apprendre les nouveaux exercices (lat pulldown, hip thrust, SDT roumain) · technique prioritaire · charges légères' },
      { color: 'var(--accent)', text: 'Jambes : surveiller attentivement les adducteurs sur la presse · stopper à la moindre gêne · noter les charges' },
      { color: 'var(--status-warning)', text: 'Élévations latérales : rester à 9 kg · ajouter excentrique 4 s · compter les reps exactes à chaque série' },
      { color: 'var(--module-nutri)', text: 'Cardio : 2 × récupération active · FC 110–130 bpm · résistance 2–3 · piloter par la FC' },
      { color: 'var(--text-secondary)', text: 'Posture : vacuum à jeun dès jour 1 · étirements psoas chaque soir · routine B mercredi' }
    ]
  },
  {
    weeks: 'Semaines 3–4',
    pillStyle: 'background:var(--module-nutri-dim);color:var(--module-nutri);',
    title: 'Montée en charge',
    rows: [
      { color: 'var(--module-sleep)', text: 'Musculation : charger progressivement · noter chaque série · double progression active' },
      { color: 'var(--accent)', text: 'Jambes : si aucune gêne adducteurs → retrouver les charges habituelles progressivement' },
      { color: 'var(--status-warning)', text: 'Élévations latérales : ajouter rest-pause sur la dernière série · viser +2 reps par série vs sem. 1–2' },
      { color: 'var(--module-nutri)', text: "Cardio : vérifier que les jambes récupèrent mieux grâce aux séances actives · ajuster résistance si FC trop basse" },
      { color: 'var(--text-secondary)', text: "Posture : évaluer si l'antéversion commence à se réduire · planche avec rétroversion active" }
    ]
  },
  {
    weeks: 'Semaines 5–6',
    pillStyle: 'background:var(--accent-dim);color:var(--accent);',
    title: 'Intensification',
    rows: [
      { color: 'var(--module-sleep)', text: 'Musculation : double progression sur tous les exercices · lat pulldown en progression (charge croissante vers tractions libres)' },
      { color: 'var(--status-warning)', text: 'Élévations latérales : tester les 1,5 reps sur 2 séries Upper · drop set systématique sur dernière série Jeudi' },
      { color: 'var(--module-nutri)', text: 'Cardio : si FC stable sous 125 bpm en récupération → envisager introduction zone 3–4 vendredi' },
      { color: 'var(--text-secondary)', text: 'Abdos : progresser sur dead bug (amplitude plus grande) · ajouter lest sur rotations russes si pratiquées' }
    ]
  },
  {
    weeks: 'Semaines 7–8',
    pillStyle: 'background:var(--accent-dim);color:var(--accent);',
    title: 'Zone 3–4 + Décharge muscu',
    rows: [
      { color: 'var(--module-sleep)', text: "Musculation : décharge semaine 7 — voir tableau Décharge dans l'onglet Musculation · −1 série/exercice · mêmes charges · reprise full semaine 8" },
      { color: 'var(--module-nutri)', text: 'Cardio : zone 3–4 le vendredi (FC 155–170 bpm · 25 min) · récupération active conservée le lundi' },
      { color: 'var(--status-warning)', text: 'Élévations latérales : bilan · si 4×15 tenus proprement en excentrique → tester charge supérieure' },
      { color: 'var(--text-secondary)', text: "Bilan : peser à jeun · ajuster calories si hors 80–84 kg · évaluer antéversion visuellement · définir objectifs bloc suivant" }
    ]
  }
]

const dechargeBlocs = [
  {
    day: 'Mardi',
    pillStyle: 'background:var(--module-sleep-dim);color:var(--module-sleep);',
    title: 'Push',
    totalNormal: '16',
    totalDecharge: '11',
    exercises: [
      { name: 'Chest press incliné machine',    normal: '3 × 8-10',   decharge: '2 × 8-10' },
      { name: 'Chest fly machine',              normal: '3 × 12-15',  decharge: '2 × 12-15' },
      { name: 'Extension triceps poulie basse', normal: '3 × 12-15',  decharge: '2 × 12-15' },
      { name: 'Extension triceps poulie haute', normal: '3 × 12-15',  decharge: '2 × 12-15' },
      { name: 'Élévations latérales haltères',  normal: '4 × 15',     decharge: '3 × 15' }
    ]
  },
  {
    day: 'Mercredi',
    pillStyle: 'background:var(--module-sleep-dim);color:var(--module-sleep);',
    title: 'Pull',
    totalNormal: '19',
    totalDecharge: '13',
    exercises: [
      { name: 'Lat pulldown',               normal: '4 × 8-10',   decharge: '3 × 8-10' },
      { name: 'Mid row machine',            normal: '3 × 8-10',   decharge: '2 × 8-10' },
      { name: 'Tirage horizontal V-grip',   normal: '3 × 10-12',  decharge: '2 × 10-12' },
      { name: 'Face pulls / oiseau poulie', normal: '3 × 15',     decharge: '2 × 15' },
      { name: 'Curl pupitre haltères',      normal: '3 × 10-12',  decharge: '2 × 10-12' },
      { name: 'Curl marteau haltères',      normal: '3 × 12',     decharge: '2 × 12' }
    ]
  },
  {
    day: 'Jeudi',
    pillStyle: 'background:var(--accent-dim);color:var(--accent);',
    title: 'Legs',
    totalNormal: '24',
    totalDecharge: '17',
    exercises: [
      { name: 'Presse pieds bas',              normal: '3 × 10-12',  decharge: '2 × 10-12' },
      { name: 'Presse unilatérale',            normal: '3 × 10-12',  decharge: '2 × 10-12' },
      { name: 'Leg extension',                 normal: '3 × 15',     decharge: '2 × 15' },
      { name: 'Leg curl allongé',              normal: '4–5 × 12-15', decharge: '3 × 12-15' },
      { name: 'Mollets debout',                normal: '4 × 15',     decharge: '3 × 15' },
      { name: 'Élévations latérales haltères', normal: '4 × 15',     decharge: '3 × 15' },
      { name: 'Face pulls / oiseau poulie',    normal: '4 × 15',     decharge: '3 × 15' }
    ]
  },
  {
    day: 'Samedi',
    pillStyle: 'background:var(--module-dress-dim);color:var(--module-dress);',
    title: 'Upper',
    totalNormal: '22',
    totalDecharge: '15',
    exercises: [
      { name: 'Chest press machine',                     normal: '3 × 8-10',   decharge: '2 × 8-10' },
      { name: 'Tirage vertical unilatéral poulie haute', normal: '3 × 10-12',  decharge: '2 × 10-12' },
      { name: 'Machine fly pec deck',                    normal: '3 × 12',     decharge: '2 × 12' },
      { name: 'Pull-over poulie haute',                  normal: '3 × 12-15',  decharge: '2 × 12-15' },
      { name: 'Élévations latérales poulie',             normal: '4 × 15',     decharge: '3 × 15' },
      { name: 'Superset curl + extension triceps',       normal: '3 × 12',     decharge: '2 × 12' },
      { name: 'Face pulls / oiseau poulie',              normal: '3 × 15',     decharge: '2 × 15' }
    ]
  },
  {
    day: 'Dimanche',
    pillStyle: 'background:var(--module-nutri-dim);color:var(--module-nutri);',
    title: 'Lower',
    totalNormal: '15',
    totalDecharge: '10',
    exercises: [
      { name: 'Leg curl allongé machine',   normal: '3 × 12-15',  decharge: '2 × 12-15' },
      { name: 'Hip thrust machine',         normal: '3 × 12',     decharge: '2 × 12' },
      { name: 'SDT roumain haltères',       normal: '3 × 10-12',  decharge: '2 × 10-12' },
      { name: 'Presse pieds bas',           normal: '3 × 10-12',  decharge: '2 × 10-12' },
      { name: 'Relevés de jambes suspendu', normal: '3 × 15',     decharge: '2 × 15' }
    ]
  }
]

const mealtiming = [
  { time: '7h00',  label: 'Réveil · vacuum à jeun', note: '3 × 30 s avant tout repas' },
  { time: '7h30',  label: 'Petit-déjeuner glucides + protéines', note: "Flocons d'avoine · fromage blanc · œufs · pain complet" },
  { time: '12h30', label: 'Déjeuner complet', note: 'Riz ou patates · viande ou poisson · légumes' },
  { time: '17h00', label: 'Pré-workout (60–90 min avant)', note: 'Glucides + protéines · riz + thon · pain + jambon' },
  { time: '18h30', label: 'Séance salle' },
  { time: '20h30', label: 'Repas post-workout (dans les 2h)', note: 'Protéines prioritaires · viande · poisson · œufs' },
  { time: '22h00', label: 'Collation soir si faim', note: 'Fromage blanc 0% · yaourt grec · cottage cheese' }
]

const nutritionRules = [
  { text: 'Balance 1x/semaine · lundi matin à jeun · objectif 80–84 kg', note: 'Si poids stagne sous 82 kg malgré bonne alimentation → passer à +200 kcal/jour' },
  { text: 'Poids sous 80 kg → +200 kcal/jour', note: 'Une poignée de noix · une banane · un bol de riz en plus' },
  { text: 'Prise trop rapide (+500 g/sem) → réduire glucides · jamais les protéines' },
  { text: 'Supplémentation', note: 'Vitamine D3 2 000 UI/j · magnésium bisglycinate 300 mg soir · whey si protéines insuffisantes' }
]
</script>

<style scoped>
/* ── En-tête ── */
.view-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

.view-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.view-title-soft { color: var(--text-secondary); }

/* ── Boutons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.btn:hover { opacity: 0.88; }
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--dark  { background: var(--action); color: var(--on-action); }
.btn--soft  { background: var(--bg-overlay); color: var(--text-primary); }
.btn--light { background: var(--bg-raised); color: var(--text-primary); }
.btn--wide  { width: 100%; }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.error {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-error-dim);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-error);
}

/* ── Bandeau ── */
.banner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: var(--space-2);
  min-height: 160px;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.banner > :not(.orb) {
  position: relative;
  z-index: var(--z-raised);
}

.banner-title {
  max-width: 72%;
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.banner-title-soft { color: var(--text-secondary); }

.chip {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--status-success);
}

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

/* ── Cartes ── */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card-label,
.card-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Sélecteur ── */
.segmented {
  display: flex;
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
}

.segmented-btn {
  flex: 1;
  min-height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.segmented-btn--active {
  background: var(--action);
  color: var(--on-action);
}

.plan-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

.banner {
  background: var(--aurore-plan);
  min-height: 130px;
}

.orb--a { top: -42px; right: -30px; width: 120px; height: 120px; background: var(--orb-lilas); }
.orb--b { top: 44px; right: -26px; width: 60px; height: 60px; background: var(--orb-ciel); }

.tabs-bar {
  display: flex;
  gap: var(--space-1);
  margin: 0 calc(var(--space-4) * -1);
  padding: 0 var(--space-4);
  overflow-x: auto;
  scrollbar-width: none;
}

.tab-btn {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 var(--space-4);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.tab-btn--active {
  background: var(--action);
  color: var(--on-action);
}

.tab-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  align-items: start;
}

.tip,
.section-intro {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-raised);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--text-secondary);
}

.card .tip {
  margin-top: var(--space-1);
  padding: var(--space-3);
  background: var(--bg-overlay);
}

/* ── Semaine ── */
.week-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-2);
}

.day-card {
  gap: var(--space-1);
}

.day-card--today {
  background: var(--rail);
  color: var(--on-rail);
}

.day-card--today .day-label,
.day-card--today .day-sub,
.day-card--today .day-note { color: var(--on-rail-dim); }

.day-card--today .day-title { color: var(--on-rail); }
.day-card--today .badge { background: var(--on-rail) !important; color: var(--on-rail-active-text) !important; }

.day-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.day-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.day-sub,
.day-note {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.badge {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-2xs);
  font-weight: 500;
}

.new-b {
  margin-left: var(--space-1);
  background: var(--accent-dim);
  color: var(--accent);
}

/* ── Chiffres ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.stat-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.stat-val {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stat-val--sm { font-size: var(--text-lg); }

/* ── Tableaux d'exercices ── */
.day-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.day-pill {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-2xs);
  font-weight: 600;
}

.session-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.bloc-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.col-header,
.ex-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px 58px;
  align-items: start;
  gap: var(--space-2);
}

.col-header { padding-top: var(--space-1); }

.col-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
}

.col-label--left { text-align: left; }

.sep {
  padding-top: var(--space-2);
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.ex-row {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
}

.ex-row.single,
.ex-row--single { grid-template-columns: minmax(0, 1fr); }
.ex-row--timing { grid-template-columns: minmax(0, 1fr) auto; }

.ex-name {
  font-size: var(--text-sm);
  font-weight: 500;
}

.ex-note {
  margin-top: 2px;
  font-size: var(--text-2xs);
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-secondary);
}

.ex-sets,
.ex-rest {
  font-size: var(--text-xs);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ex-sets { font-weight: 600; }
.ex-rest { color: var(--text-secondary); }
.ex-sets--strikethrough { color: var(--text-secondary); text-decoration: line-through; }
.ex-sets--accent { color: var(--accent); }

.card-title { margin-bottom: var(--space-1); }

/* ── Décharge ── */
.decharge-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  padding-top: var(--space-3);
}

.decharge-title,
.decharge-sub { grid-column: 1 / -1; }

.decharge-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.decharge-sub {
  margin-top: calc(var(--space-2) * -1);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.decharge-count {
  margin-left: auto;
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Phases ── */
.phase-row {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: var(--space-2);
  padding: var(--space-1) 0;
  font-size: var(--text-xs);
  line-height: 1.45;
  color: var(--text-secondary);
}

.phase-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
}

@media (min-width: 768px) {
  .view-break { display: none; }

  .view-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .banner { padding: var(--space-6) 28px; }
  .card { padding: 20px; }
  .tabs-bar { margin: 0; padding: 0; flex-wrap: wrap; }
  .stats-row { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .week-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1100px) {
  .plan-view { gap: var(--space-4); }
  .tab-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
  .tab-panel > .tip,
  .tab-panel > .section-intro,
  .tab-panel > .stats-row,
  .tab-panel > .week-grid,
  .tab-panel > .decharge-section { grid-column: 1 / -1; }
  .week-grid { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; }
  .day-card { min-height: 240px; }
  .decharge-section { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
  .orb--a { top: -70px; right: 90px; width: 220px; height: 220px; }
  .orb--b { top: 40px; right: 20px; width: 110px; height: 110px; }
}
</style>
