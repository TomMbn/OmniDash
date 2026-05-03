<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-black tracking-tight text-slate-900">Plan d'entraînement</h1>
      <p class="text-sm text-slate-500 mt-1">Programme complet · 8 semaines</p>
    </div>

    <div class="tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
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
          <div class="stat-label">Vacuum + posture</div>
          <div class="stat-val">7j/7</div>
        </div>
      </div>

      <div class="tip">Priorités morphologiques intégrées : grand dorsal (tractions) + deltoïdes latéraux (5 séries/séance Upper) + pectoraux (double progression) + correction antéversion (dead bug, pont fessier, étirements psoas).</div>
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
          <span class="col-label left">Exercice</span>
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

      <div class="tip">Double progression : atteins la limite haute de la plage en reps → monte de 2,5 kg → recommence à la limite basse. Décharge toutes les 6–8 semaines (−30% volume, mêmes charges).</div>
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
          <div class="stat-val" style="font-size:16px;">35–40 min</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">FC zone 2</div>
          <div class="stat-val" style="font-size:16px;">120–140 bpm</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Dépense estimée</div>
          <div class="stat-val">~500 kcal</div>
          <div class="stat-label">par semaine</div>
        </div>
      </div>

      <div class="card" style="border-left:2px solid #185FA5;border-radius:0 12px 12px 0;">
        <div class="day-header">
          <span class="badge" style="background:#E6F1FB;color:#0C447C;">Phase 1 — sem. 1 à 6</span>
          <span class="session-title">2 × LISS zone 2</span>
        </div>
        <div class="ex-row single"><span class="ex-name">Vélo résistance modérée · 120–140 bpm · parler sans être essoufflé<div class="ex-note">35–40 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Marche rapide / nordic walking · 6–7 km/h<div class="ex-note">40–50 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Rowing ergomètre (si dispo) <span class="badge new-b">Recommandé longiligne</span><div class="ex-note">30–35 min · bras longs = avantage mécanique</div></span></div>
        <div class="tip">Semaine 6 : même FC à intensité plus élevée = base aérobie qui progresse → passer en phase 2.</div>
      </div>

      <div class="card" style="margin-top:10px;">
        <div class="day-header">
          <span class="badge" style="background:#FAEEDA;color:#633806;">Phase 2 — sem. 7+</span>
          <span class="session-title">1 × LISS + 1 × Zone 3–4</span>
        </div>
        <div class="ex-row single"><span class="ex-name">LISS zone 2 — lundi · conservé comme base<div class="ex-note">35 min</div></span></div>
        <div class="ex-row single"><span class="ex-name">Zone 3–4 — vendredi · vélo tempo ou rowing · FC 155–170 bpm<div class="ex-note">25–30 min · ou sprints tabata : 20 s effort / 40 s récup × 10 rounds</div></span></div>
        <div class="tip">Jamais zone 3–4 la veille d'une séance lourde. Jamais avant 6 semaines de LISS.</div>
      </div>
    </div>

    <!-- ABDOS & POSTURE -->
    <div v-show="activeTab === 'abdos'">
      <div style="font-size:13px;color:#64748b;margin-bottom:14px;">3x/semaine · lundi, mercredi, vendredi · ~18 min · aucun matériel. Vacuum + routine posturale quotidiens 7j/7.</div>

      <div v-for="bloc in abdosBlocs" :key="bloc.title" class="card">
        <div class="day-header">
          <span class="day-pill" :style="bloc.pillStyle">{{ bloc.title }}</span>
          <span v-if="bloc.sub" style="font-size:13px;color:#64748b;">{{ bloc.sub }}</span>
        </div>
        <div class="col-header">
          <span class="col-label left">Exercice</span>
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
          <div class="stat-val" style="font-size:16px;">3 000–3 100</div>
          <div class="stat-label">kcal/jour · maintenance</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Protéines</div>
          <div class="stat-val" style="font-size:16px;">160–165 g</div>
          <div class="stat-label">2 g/kg · priorité absolue</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Lipides min.</div>
          <div class="stat-val" style="font-size:16px;">80–90 g</div>
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
        <div v-for="meal in mealtiming" :key="meal.time" class="ex-row timing">
          <span class="ex-name">{{ meal.label }}<div v-if="meal.note" class="ex-note">{{ meal.note }}</div></span>
          <span class="ex-sets">{{ meal.time }}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Règles de suivi</div>
        <div v-for="rule in nutritionRules" :key="rule.text" class="ex-row single">
          <span class="ex-name">{{ rule.text }}<div v-if="rule.note" class="ex-note">{{ rule.note }}</div></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

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
      { text: 'Cardio 35 min', style: 'background:#EAF3DE;color:#27500A;' },
      { text: 'Abdos & antéversion', style: 'background:#FAEEDA;color:#633806;' }
    ]
  },
  {
    name: 'Mardi',
    title: 'Push',
    sub: 'Pecs · Épaules · Triceps',
    badges: [{ text: 'Salle · ~55 min', style: 'background:#E6F1FB;color:#0C447C;' }]
  },
  {
    name: 'Mercredi',
    title: 'Pull + Abdos',
    sub: 'Dos · Biceps · Core',
    badges: [
      { text: 'Salle · ~60 min', style: 'background:#E6F1FB;color:#0C447C;' },
      { text: 'Abdos maison soir', style: 'background:#FAEEDA;color:#633806;' }
    ]
  },
  {
    name: 'Jeudi',
    title: 'Legs',
    sub: 'Quads · Ischios · Mollets',
    badges: [{ text: 'Salle · ~55 min', style: 'background:#FAECE7;color:#712B13;' }]
  },
  {
    name: 'Vendredi',
    title: 'LISS + Abdos',
    sub: 'Cardio zone 2 · Core',
    badges: [
      { text: 'Cardio 35 min', style: 'background:#EAF3DE;color:#27500A;' },
      { text: 'Abdos maison', style: 'background:#FAEEDA;color:#633806;' }
    ]
  },
  {
    name: 'Samedi',
    title: 'Upper',
    sub: 'Grand dorsal · Épaules · Bras',
    badges: [{ text: 'Salle · ~60 min', style: 'background:#FBEAF0;color:#72243E;' }]
  },
  {
    name: 'Dimanche',
    title: 'Lower',
    sub: 'Ischios · Fessiers · Core',
    badges: [{ text: 'Salle · ~55 min', style: 'background:#E1F5EE;color:#085041;' }],
    note: 'SDT roumain en 4e position'
  }
]

const muscuSessions = [
  {
    day: 'Mardi',
    pillStyle: 'background:#E6F1FB;color:#0C447C;',
    title: 'Push — Pecs, Épaules & Triceps',
    items: [
      { sep: 'Épaules en premier — à froid pour maximiser le stimulus' },
      { name: 'Élévations latérales poulie unilatérale', note: 'Excentrique 4 s · rest-pause sur la 4e série · 9 kg → progression via reps et tempo avant de monter la charge', sets: '4 × 12-15', rest: '60 s' },
      { sep: 'Pectoraux' },
      { name: 'Chest press incliné machine', note: 'Double progression prioritaire — exercice clé pour l\'épaisseur des pecs', sets: '3 × 8-10', rest: '2–3 min' },
      { name: 'Chest fly machine', note: 'Étirement maximal en bas du mouvement · contraction 1 s en haut', sets: '3 × 12-15', rest: '90 s' },
      { sep: 'Triceps & prévention épaules' },
      { name: 'Extension triceps poulie basse', sets: '3 × 12-15', rest: '90 s' },
      { name: 'Extension triceps poulie haute', sets: '3 × 12-15', rest: '90 s' },
      { name: 'Face pulls câble', note: 'Correction protraction épaules · retirer si fatigue après Pull du mercredi', sets: '3 × 15-20', rest: '45 s' }
    ]
  },
  {
    day: 'Mercredi',
    pillStyle: 'background:#E6F1FB;color:#0C447C;',
    title: 'Pull — Dos & Biceps',
    items: [
      { sep: 'Grand dorsal — largeur prioritaire' },
      { name: 'Lat pulldown machine (ou traction assistée)', badge: 'Priorité V-taper', note: 'Amplitude maximale — étire le grand dorsal en haut · progression vers tractions lestées', sets: '4 × 8-10', rest: '2–3 min' },
      { sep: 'Épaisseur du dos' },
      { name: 'Mid row machine', sets: '3 × 8-10', rest: '2 min' },
      { name: 'Seated cable row V-grip', sets: '3 × 10-12', rest: '90 s' },
      { sep: 'Épaules postérieures & biceps' },
      { name: 'Face pulls / oiseau poulie haute', note: 'Correction protraction · deltoïde postérieur', sets: '3 × 15', rest: '45 s' },
      { name: 'Curl pupitre haltères', sets: '3 × 10-12', rest: '90 s' },
      { name: 'Curl marteau haltères', sets: '3 × 12', rest: '60 s' }
    ]
  },
  {
    day: 'Jeudi',
    pillStyle: 'background:#FAECE7;color:#712B13;',
    title: 'Legs — Focus Quadriceps',
    items: [
      { sep: 'Échauffement postural — activer fessiers avant les charges' },
      { name: 'Pont fessier (glute bridge) au sol', badge: 'Antéversion', note: '2 s en haut · bas du dos plaqué au sol · activation avant presse', sets: '2 × 15', rest: '30 s' },
      { sep: 'Quadriceps' },
      { name: 'Split squat statique haltères', badge: 'Remplace bulgares', note: 'Progression vers fentes bulgares dans 4–8 semaines · surveiller adducteurs', sets: '4 × 8-10', rest: '2–3 min' },
      { name: 'Presse pieds bas', note: 'Reprise progressive — stopper à la moindre gêne adducteurs', sets: '3 × 10-12', rest: '2 min' },
      { name: 'Leg extension (contraction 2 s)', sets: '3 × 15', rest: '60 s' },
      { sep: 'Ischios & mollets' },
      { name: 'Leg curl allongé', sets: '3 × 12-15', rest: '90 s' },
      { name: 'Mollets debout (noter la charge)', sets: '4 × 15', rest: '60 s' }
    ]
  },
  {
    day: 'Samedi',
    pillStyle: 'background:#FBEAF0;color:#72243E;',
    title: 'Upper — Grand Dorsal & V-Taper',
    items: [
      { sep: 'Grand dorsal — exercice principal V-taper' },
      { name: 'Tractions assistées (bande / machine)', badge: 'Priorité absolue', note: 'Amplitude maximale · étire le grand dorsal en haut · progression vers tractions libres puis lestées', sets: '4 × 6-10', rest: '2–3 min' },
      { name: 'Pull-over poulie haute', note: 'Grand dentelé + grand dorsal · expansion thoracique', sets: '3 × 12-15', rest: '90 s' },
      { sep: 'Deltoïdes latéraux — 5 séries · priorité morphologique' },
      { name: 'Élévations latérales poulie unilatérale', note: '1,5 reps sur séries 1–2 · excentrique 4 s sur séries 3–4 · drop set sur série 5', sets: '5 × 12-15', rest: '60 s' },
      { sep: 'Prévention & finition' },
      { name: 'Face pulls câble', note: 'Deltoïde postérieur · correction protraction épaules', sets: '3 × 15-20', rest: '45 s' },
      { name: 'Superset — curl incliné + extension triceps', note: 'Enchaîner sans repos entre les deux exercices', sets: '3 × 12', rest: '60 s' }
    ]
  },
  {
    day: 'Dimanche',
    pillStyle: 'background:#E1F5EE;color:#085041;',
    title: 'Lower — Ischios, Fessiers & Core',
    items: [
      { sep: 'En premier — échauffement bas du dos + activation fessiers' },
      { name: 'Presse pieds hauts (fessiers)', note: 'Reprendre progressivement · surveiller adducteurs', sets: '3 × 10-12', rest: '2 min' },
      { name: 'Leg curl allongé machine', sets: '3 × 12-15', rest: '90 s' },
      { name: 'Hip thrust machine ou haltère', badge: 'Antéversion', note: 'Fessier antagoniste du psoas · clé pour corriger l\'antéversion', sets: '3 × 12', rest: '90 s' },
      { sep: 'En 4e position — bas du dos échauffé' },
      { name: 'SDT roumain haltères', note: 'Noter la charge systématiquement · exercice principal ischios', sets: '4 × 10-12', rest: '2–3 min' },
      { sep: 'Core' },
      { name: 'Relevés de jambes ou crunch câble', sets: '3 × 15', rest: '45 s' },
      { name: 'Planche (rétroversion active du bassin)', note: 'Rentrer le bassin sous soi pendant toute la tenue', sets: '3 × 30-45 s', rest: '30 s' }
    ]
  }
]

const abdosBlocs = [
  {
    title: 'Bloc 1 — Posture & antéversion',
    sub: 'À faire en premier',
    pillStyle: 'background:#E6F1FB;color:#0C447C;',
    colLabel: 'Séries × durée',
    exercises: [
      { name: 'Vacuum abdominal', badge: 'Quotidien à jeun', note: 'Expire tout l\'air · rentre le nombril vers la colonne · transverse profond', sets: '3 × 30-45 s', rest: '30 s' },
      { name: 'Rétroversion active du bassin', note: 'Allongé sur le dos · aplatir le bas du dos contre le sol · contracter abdos + fessiers · tenir 5 s', sets: '3 × 15 reps', rest: '20 s' },
      { name: 'Pont fessier (glute bridge)', note: 'Monter le bassin · contracter les fessiers · tenir 2 s en haut · bas du dos ne cambre pas', sets: '3 × 15 reps', rest: '30 s' },
      { name: 'Dead bug', note: 'Allongé · bras vers plafond · hanches/genoux à 90° · descendre bras droit + jambe gauche en expirant · bas du dos plaqué au sol en permanence · alterner', sets: '3 × 8-10 / côté', rest: '30 s' }
    ]
  },
  {
    title: 'Bloc 2 — Core & V-line',
    pillStyle: 'background:#E1F5EE;color:#085041;',
    exercises: [
      { name: 'Relevés de jambes tendues', note: 'Mains sous les fessiers · descente 3 s · jambes fléchies si trop difficile', sets: '3 × 12-15', rest: '45 s' },
      { name: 'Crunch lent (2 s montée / 2 s descente)', sets: '3 × 15-20', rest: '30 s' },
      { name: 'Planche avant (rétroversion active)', note: 'Rentrer le bassin sous soi · pas d\'antéversion pendant la tenue', sets: '3 × 30-45 s', rest: '30 s' }
    ]
  },
  {
    title: 'Bloc 3 — Obliques & flancs',
    pillStyle: 'background:#FAECE7;color:#712B13;',
    exercises: [
      { name: 'Planche latérale', note: 'Progression : ajouter dip latéral quand trop facile', sets: '3 × 25-35 s / côté', rest: '30 s' },
      { name: 'Rotations russes lentes (sans charge → avec lest)', sets: '3 × 20 reps', rest: '30 s' },
      { name: 'Flexion latérale debout (livre ou haltère léger)', sets: '3 × 15 / côté', rest: '30 s' }
    ]
  },
  {
    title: 'Étirements quotidiens — antéversion',
    sub: 'Soir · 7j/7 · ~5 min',
    pillStyle: 'background:#F1EFE8;color:#444441;',
    colLabel: 'Durée',
    exercises: [
      { name: 'Psoas en fente basse', note: 'Genou arrière au sol · bassin en rétroversion pendant l\'étirement · dos droit', sets: '45–60 s / côté', rest: '7j/7' },
      { name: 'Droit fémoral (quadriceps)', note: 'Allongé sur le ventre ou debout · talon vers les fesses · contracter légèrement le fessier', sets: '45 s / côté', rest: '7j/7' },
      { name: 'Lombaires — position enfant', note: 'Assis sur les talons · bras tendus devant · front au sol', sets: '60 s', rest: '7j/7' }
    ]
  }
]

const phases = [
  {
    weeks: 'Semaines 1–2',
    pillStyle: 'background:#E6F1FB;color:#0C447C;',
    title: 'Mise en place',
    rows: [
      { color: '#378ADD', text: 'Musculation : apprendre les nouveaux exercices (split squat, tractions assistées, dead bug, pont fessier) · charges légères · technique prioritaire' },
      { color: '#E24B4A', text: 'Jambes : uniquement leg curl + leg extension + mollets · aucune presse · surveiller adducteurs' },
      { color: '#EF9F27', text: 'Élévations latérales : rester à 9 kg · ajouter excentrique 4 s · compter les reps exactes à chaque série' },
      { color: '#1D9E75', text: 'Cardio : 2 × LISS 30 min · identifier ta zone 2 · 120–130 bpm' },
      { color: '#888780', text: 'Posture : vacuum à jeun dès jour 1 · étirements psoas chaque soir · dead bug 3x/semaine' }
    ]
  },
  {
    weeks: 'Semaines 3–4',
    pillStyle: 'background:#E1F5EE;color:#085041;',
    title: 'Montée en charge',
    rows: [
      { color: '#378ADD', text: 'Musculation : charger progressivement · noter chaque série · double progression active' },
      { color: '#E24B4A', text: 'Jambes : réintroduire la presse pieds hauts à −40% de charge · amplitude réduite · stop à la moindre gêne' },
      { color: '#EF9F27', text: 'Élévations latérales : ajouter rest-pause sur la 4e série · viser +2 reps par série vs sem. 1–2' },
      { color: '#1D9E75', text: 'Cardio : monter à 35–40 min par session LISS' },
      { color: '#888780', text: 'Posture : vérifier que l\'antéversion commence à se réduire · planche avec rétroversion active' }
    ]
  },
  {
    weeks: 'Semaines 5–6',
    pillStyle: 'background:#FAEEDA;color:#633806;',
    title: 'Intensification',
    rows: [
      { color: '#378ADD', text: 'Musculation : double progression sur tous les exercices · tractions assistées en progression (moins d\'assistance)' },
      { color: '#E24B4A', text: 'Jambes : si aucune gêne → retrouver les charges normales · tester le split squat avec plus de charge' },
      { color: '#EF9F27', text: 'Élévations latérales : tester les 1,5 reps sur 2 des 5 séries Upper · drop set systématique sur la dernière série' },
      { color: '#1D9E75', text: 'Cardio : vérifier progression zone 2 · même FC à intensité plus élevée' },
      { color: '#888780', text: 'Abdos : passer à 4 séries sur relevés de jambes · ajouter progression dead bug (amplitude plus grande)' }
    ]
  },
  {
    weeks: 'Semaines 7–8',
    pillStyle: 'background:#FAECE7;color:#712B13;',
    title: 'Zone 3–4 + décharge muscu',
    rows: [
      { color: '#378ADD', text: 'Musculation : décharge semaine 7 (−30% volume, mêmes charges) · reprise full semaine 8' },
      { color: '#E24B4A', text: 'Jambes : si tout va bien → tenter les fentes bulgares avec charge très légère' },
      { color: '#EF9F27', text: 'Élévations latérales : bilan · si 4×15 tenus proprement en excentrique → tester charge supérieure' },
      { color: '#1D9E75', text: 'Cardio : introduire 1 × zone 3–4 (FC 155–170 bpm, 25 min) en remplacement du LISS vendredi' },
      { color: '#888780', text: 'Bilan : peser à jeun · ajuster calories si hors 80–84 kg · évaluer l\'antéversion visuellement' }
    ]
  }
]

const mealtiming = [
  { time: '7h00', label: 'Réveil · vacuum à jeun', note: '3 × 30 s avant tout repas' },
  { time: '7h30', label: 'Petit-déjeuner glucides + protéines', note: 'Flocons d\'avoine · fromage blanc · œufs · pain complet' },
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
.tabs-bar {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 7px 13px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  border: 0.5px solid #cbd5e1;
  background: transparent;
  color: #64748b;
  transition: all 0.15s;
}

.tab-btn.active {
  background: #eff6ff;
  color: #4f46e5;
  border-color: transparent;
  font-weight: 500;
}

.card {
  background: white;
  border: 0.5px solid #f1f5f9;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  margin-right: 4px;
}

.new-b {
  background: #E1F5EE;
  color: #085041;
}

.ex-row {
  display: grid;
  grid-template-columns: 1fr 100px 80px;
  align-items: start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 0.5px solid #f1f5f9;
  font-size: 13px;
}

.ex-row:last-child {
  border-bottom: none;
}

.ex-row.single {
  grid-template-columns: 1fr;
}

.ex-row.timing {
  grid-template-columns: 1fr 60px;
}

.ex-name {
  color: #1e293b;
  line-height: 1.4;
}

.ex-note {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.ex-sets {
  text-align: right;
  font-size: 12px;
  color: #64748b;
  padding-top: 1px;
}

.ex-rest {
  text-align: right;
  font-size: 12px;
  color: #64748b;
  padding-top: 1px;
}

.col-header {
  display: grid;
  grid-template-columns: 1fr 100px 80px;
  gap: 8px;
  padding: 0 0 5px;
  border-bottom: 0.5px solid #e2e8f0;
  margin-bottom: 2px;
}

.col-label {
  font-size: 11px;
  color: #94a3b8;
  text-align: right;
}

.col-label.left {
  text-align: left;
}

.day-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.day-pill {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.session-title {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.tip {
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
}

.stat-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
}

.stat-val {
  font-size: 20px;
  font-weight: 500;
  color: #1e293b;
}

.phase-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  align-items: flex-start;
  font-size: 13px;
  color: #334155;
}

.phase-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.sep {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 0 4px;
  border-bottom: 0.5px solid #f1f5f9;
  margin-bottom: 2px;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.day-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 5px;
}

.day-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #1e293b;
}

.day-sub {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 8px;
}

.day-note {
  margin-top: 6px;
  font-size: 11px;
  color: #64748b;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 10px;
  color: #1e293b;
}
</style>
