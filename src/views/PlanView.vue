<template>
  <div class="plan-view">
    <!-- Header -->
    <div class="plan-header">
      <div class="module-icon">
        <Layers :size="18" stroke-width="1.75" />
      </div>
      <div>
        <h1 class="view-title">Plan d'entraînement</h1>
        <p class="view-sub">Programme complet · 8 semaines</p>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- PLAN SEMAINE -->
    <div v-show="activeTab === 'semaine'">
      <div class="week-grid">
        <div v-for="day in weekDays" :key="day.name" class="card">
          <div class="day-label">{{ day.name }}</div>
          <div class="day-title">{{ day.title }}</div>
          <div class="day-sub">{{ day.sub }}</div>
          <span v-for="badge in day.badges" :key="badge.text" class="badge" :style="badge.style">{{ badge.text }}</span>
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
    <div v-show="activeTab === 'muscu'">
      <div class="tip" style="margin-bottom:12px;">Repos : 2–3 min sur poly-articulaires lourds · 90 s sur isolation standard · 60 s sur élévations latérales · 45 s sur face pulls · 30 s entre les drop sets et rest-pause.</div>

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
    <div v-show="activeTab === 'cardio'">
      <div class="stats-row" style="margin-bottom:14px;">
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
          <span class="badge" style="background:rgba(122,145,184,0.12);color:#7A91B8;">Phase 1 — sem. 1 à 6</span>
          <span class="session-title">2 × LISS zone 2</span>
        </div>
        <div class="ex-row single"><span class="ex-name">Vélo résistance modérée · 120–140 bpm · parler sans être essoufflé<div class="ex-note">35–40 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Marche rapide / nordic walking · 6–7 km/h<div class="ex-note">40–50 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Rowing ergomètre (si dispo) <span class="badge new-b">Recommandé longiligne</span><div class="ex-note">30–35 min · bras longs = avantage mécanique</div></span></div>
        <div class="tip">Semaine 6 : même FC à intensité plus élevée = base aérobie qui progresse → passer en phase 2.</div>
      </div>

      <div class="card" style="margin-top:10px;">
        <div class="day-header">
          <span class="badge" style="background:rgba(212,151,106,0.12);color:#D4976A;">Phase 2 — sem. 7+</span>
          <span class="session-title">1 × LISS + 1 × Zone 3–4</span>
        </div>
        <div class="ex-row single"><span class="ex-name">LISS zone 2 — lundi · conservé comme base<div class="ex-note">35 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Zone 3–4 — vendredi · vélo tempo ou rowing · FC 155–170 bpm<div class="ex-note">25–30 min · ou sprints tabata : 20 s effort / 40 s récup × 10 rounds</div></span></div>
        <div class="tip">Jamais zone 3–4 la veille d'une séance lourde. Jamais avant 6 semaines de LISS.</div>
      </div>
    </div>

    <!-- ABDOS & POSTURE -->
    <div v-show="activeTab === 'abdos'">
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
    <div v-show="activeTab === 'phases'">
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
    <div v-show="activeTab === 'nutri'">
      <div class="stats-row" style="margin-bottom:14px;">
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
import { Layers } from 'lucide-vue-next'

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
      { text: 'Cardio 35 min', style: 'background:rgba(125,173,138,0.12);color:#7DAD8A;' },
      { text: 'Abdos & antéversion', style: 'background:rgba(212,151,106,0.12);color:#D4976A;' }
    ]
  },
  {
    name: 'Mardi',
    title: 'Push',
    sub: 'Pecs · Épaules · Triceps',
    badges: [{ text: 'Salle · ~55 min', style: 'background:rgba(122,145,184,0.12);color:#7A91B8;' }]
  },
  {
    name: 'Mercredi',
    title: 'Pull + Abdos',
    sub: 'Dos · Biceps · Core',
    badges: [
      { text: 'Salle · ~60 min', style: 'background:rgba(122,145,184,0.12);color:#7A91B8;' },
      { text: 'Abdos maison soir', style: 'background:rgba(212,151,106,0.12);color:#D4976A;' }
    ]
  },
  {
    name: 'Jeudi',
    title: 'Legs',
    sub: 'Quads · Ischios · Épaules',
    badges: [{ text: 'Salle · ~60 min', style: 'background:rgba(212,151,106,0.12);color:#D4976A;' }]
  },
  {
    name: 'Vendredi',
    title: 'LISS + Abdos',
    sub: 'Cardio zone 2 · Core',
    badges: [
      { text: 'Cardio 35 min', style: 'background:rgba(125,173,138,0.12);color:#7DAD8A;' },
      { text: 'Abdos maison', style: 'background:rgba(212,151,106,0.12);color:#D4976A;' }
    ]
  },
  {
    name: 'Samedi',
    title: 'Upper',
    sub: 'Grand dorsal · Épaules · Bras',
    badges: [{ text: 'Salle · ~60 min', style: 'background:rgba(184,150,126,0.12);color:#B8967E;' }]
  },
  {
    name: 'Dimanche',
    title: 'Lower',
    sub: 'Ischios · Fessiers · Core',
    badges: [{ text: 'Salle · ~55 min', style: 'background:rgba(125,173,138,0.12);color:#7DAD8A;' }],
    note: 'SDT roumain en 4e position'
  }
]

const muscuSessions = [
  {
    day: 'Mardi',
    pillStyle: 'background:rgba(122,145,184,0.12);color:#7A91B8;',
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
    pillStyle: 'background:rgba(122,145,184,0.12);color:#7A91B8;',
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
    pillStyle: 'background:rgba(212,151,106,0.12);color:#D4976A;',
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
    pillStyle: 'background:rgba(184,150,126,0.12);color:#B8967E;',
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
    pillStyle: 'background:rgba(125,173,138,0.12);color:#7DAD8A;',
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
    pillStyle: 'background:rgba(125,173,138,0.12);color:#7DAD8A;',
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
    pillStyle: 'background:rgba(122,145,184,0.12);color:#7A91B8;',
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
    pillStyle: 'background:rgba(240,235,227,0.07);color:var(--text-muted);',
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
    pillStyle: 'background:rgba(122,145,184,0.12);color:#7A91B8;',
    title: 'Mise en place',
    rows: [
      { color: '#7A91B8', text: 'Musculation : apprendre les nouveaux exercices (lat pulldown, hip thrust, SDT roumain) · technique prioritaire · charges légères' },
      { color: '#D4976A', text: 'Jambes : surveiller attentivement les adducteurs sur la presse · stopper à la moindre gêne · noter les charges' },
      { color: '#C9A04C', text: 'Élévations latérales : rester à 9 kg · ajouter excentrique 4 s · compter les reps exactes à chaque série' },
      { color: '#7DAD8A', text: 'Cardio : 2 × récupération active · FC 110–130 bpm · résistance 2–3 · piloter par la FC' },
      { color: 'var(--text-muted)', text: 'Posture : vacuum à jeun dès jour 1 · étirements psoas chaque soir · routine B mercredi' }
    ]
  },
  {
    weeks: 'Semaines 3–4',
    pillStyle: 'background:rgba(125,173,138,0.12);color:#7DAD8A;',
    title: 'Montée en charge',
    rows: [
      { color: '#7A91B8', text: 'Musculation : charger progressivement · noter chaque série · double progression active' },
      { color: '#D4976A', text: 'Jambes : si aucune gêne adducteurs → retrouver les charges habituelles progressivement' },
      { color: '#C9A04C', text: 'Élévations latérales : ajouter rest-pause sur la dernière série · viser +2 reps par série vs sem. 1–2' },
      { color: '#7DAD8A', text: "Cardio : vérifier que les jambes récupèrent mieux grâce aux séances actives · ajuster résistance si FC trop basse" },
      { color: 'var(--text-muted)', text: "Posture : évaluer si l'antéversion commence à se réduire · planche avec rétroversion active" }
    ]
  },
  {
    weeks: 'Semaines 5–6',
    pillStyle: 'background:rgba(212,151,106,0.12);color:#D4976A;',
    title: 'Intensification',
    rows: [
      { color: '#7A91B8', text: 'Musculation : double progression sur tous les exercices · lat pulldown en progression (charge croissante vers tractions libres)' },
      { color: '#C9A04C', text: 'Élévations latérales : tester les 1,5 reps sur 2 séries Upper · drop set systématique sur dernière série Jeudi' },
      { color: '#7DAD8A', text: 'Cardio : si FC stable sous 125 bpm en récupération → envisager introduction zone 3–4 vendredi' },
      { color: 'var(--text-muted)', text: 'Abdos : progresser sur dead bug (amplitude plus grande) · ajouter lest sur rotations russes si pratiquées' }
    ]
  },
  {
    weeks: 'Semaines 7–8',
    pillStyle: 'background:rgba(212,151,106,0.15);color:#D4976A;',
    title: 'Zone 3–4 + Décharge muscu',
    rows: [
      { color: '#7A91B8', text: "Musculation : décharge semaine 7 — voir tableau Décharge dans l'onglet Musculation · −1 série/exercice · mêmes charges · reprise full semaine 8" },
      { color: '#7DAD8A', text: 'Cardio : zone 3–4 le vendredi (FC 155–170 bpm · 25 min) · récupération active conservée le lundi' },
      { color: '#C9A04C', text: 'Élévations latérales : bilan · si 4×15 tenus proprement en excentrique → tester charge supérieure' },
      { color: 'var(--text-muted)', text: "Bilan : peser à jeun · ajuster calories si hors 80–84 kg · évaluer antéversion visuellement · définir objectifs bloc suivant" }
    ]
  }
]

const dechargeBlocs = [
  {
    day: 'Mardi',
    pillStyle: 'background:rgba(122,145,184,0.12);color:#7A91B8;',
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
    pillStyle: 'background:rgba(122,145,184,0.12);color:#7A91B8;',
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
    pillStyle: 'background:rgba(212,151,106,0.12);color:#D4976A;',
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
    pillStyle: 'background:rgba(184,150,126,0.12);color:#B8967E;',
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
    pillStyle: 'background:rgba(125,173,138,0.12);color:#7DAD8A;',
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
.plan-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 8px 0 100px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Header ── */
.plan-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 2px;
}

.module-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: rgba(212, 151, 106, 0.10);
  border: 1px solid rgba(212, 151, 106, 0.20);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.view-title {
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  font-weight: 400;
  color: var(--text-primary);
  margin: 0;
}

.view-sub {
  font-size: 9px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-top: 1px;
}

/* ── Tab bar ── */
.tabs-bar {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 7px 13px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-sans);
  transition: all var(--dur-fast) var(--ease-out);
}

.tab-btn:hover { color: var(--text-secondary); border-color: var(--border-default); }

.tab-btn--active {
  background: rgba(212, 151, 106, 0.10);
  color: var(--accent);
  border-color: rgba(212, 151, 106, 0.25);
}

/* ── Card ── */
.card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  margin-bottom: 10px;
}

.card--decharge {
  border-left: 2px solid rgba(212, 151, 106, 0.30);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.card--accent-blue {
  border-left: 2px solid #7A91B8;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

/* ── Badge ── */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
  margin-right: 4px;
  margin-bottom: 4px;
}

.new-b {
  background: rgba(125, 173, 138, 0.10);
  color: #7DAD8A;
}

/* ── Ex row ── */
.ex-row {
  display: grid;
  grid-template-columns: 1fr 100px 80px;
  align-items: start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13px;
}

.ex-row:last-child { border-bottom: none; }

.ex-row--single { grid-template-columns: 1fr; }
.ex-row--timing { grid-template-columns: 1fr 60px; }

.ex-name {
  color: var(--text-primary);
  line-height: 1.4;
}

.ex-note {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 3px;
  line-height: 1.4;
}

.ex-sets {
  text-align: right;
  font-size: 12px;
  color: var(--text-muted);
  padding-top: 1px;
}

.ex-sets--strikethrough {
  opacity: 0.35;
  text-decoration: line-through;
}

.ex-sets--accent {
  color: var(--accent);
  font-weight: 600;
}

.ex-rest {
  text-align: right;
  font-size: 12px;
  color: var(--text-muted);
  padding-top: 1px;
}

/* ── Col header ── */
.col-header {
  display: grid;
  grid-template-columns: 1fr 100px 80px;
  gap: 8px;
  padding: 0 0 6px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 2px;
}

.col-label {
  font-size: 10px;
  color: var(--text-muted);
  text-align: right;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.col-label--left { text-align: left; }

/* ── Day header ── */
.day-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.day-pill {
  padding: 4px 11px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

/* ── Tip ── */
.tip {
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
  line-height: 1.5;
}

/* ── Stat cards ── */
.stat-card {
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 12px;
  text-align: center;
}

.stat-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1.4;
}

.stat-val {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  color: var(--accent);
  margin: 4px 0 2px;
  line-height: 1;
}

.stat-val--sm { font-size: 16px; }

/* ── Phase row ── */
.phase-row {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  align-items: flex-start;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.phase-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

/* ── Sep ── */
.sep {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 10px 0 4px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 2px;
}

/* ── Week grid ── */
.week-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.day-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 5px;
}

.day-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.day-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
  line-height: 1.4;
}

.day-note {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

/* ── Stats row ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

/* ── Card title ── */
.card-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 10px;
}

/* ── Decharge section ── */
.decharge-section { margin-top: 20px; }

.decharge-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.decharge-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 12px;
  line-height: 1.5;
}

.decharge-count {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
}

/* ── Section intro ── */
.section-intro {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 14px;
  line-height: 1.5;
}

/* ── Bloc sub ── */
.bloc-sub {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
