import { computed, ref, watch } from 'vue'

// ══════════════════════════════════════
// PLANNING HEBDOMADAIRES
// ══════════════════════════════════════

export const STANDARD_WEEK = {
    1: { label: 'Lundi', session: 'REPOS' },
    2: { label: 'Mardi', session: 'PUSH' },
    3: { label: 'Mercredi', session: 'PULL' },
    4: { label: 'Jeudi', session: 'LEGS' },
    5: { label: 'Vendredi', session: 'REPOS' },
    6: { label: 'Samedi', session: 'UPPER', extra: '+ 🏃 VO2 Max' },
    0: { label: 'Dimanche', session: 'LOWER', extra: '+ 🏃 Zone 2' },
}

export const MATCH_WEEK = {
    1: { label: 'Lundi', session: 'PUSH', note: 'Décalé' },
    2: { label: 'Mardi', session: 'MATCH' },
    3: { label: 'Mercredi', session: 'MATCH' },
    4: { label: 'Jeudi', session: 'PULL', note: 'Décalé' },
    5: { label: 'Vendredi', session: 'LEGS', note: 'Décalé' },
    6: { label: 'Samedi', session: 'UPPER' },
    0: { label: 'Dimanche', session: 'LOWER' },
}

// ══════════════════════════════════════
// TEMPLATES DE SÉANCES (defaults)
// ══════════════════════════════════════

const DEFAULT_TEMPLATES = {
    PUSH: {
        label: 'PUSH',
        emoji: '🔥',
        description: 'Pecs, Épaules, Triceps — Densité de poussée et largeur',
        color: 'from-red-500 to-orange-500',
        exercises: [
            { name: 'Chest Press incliné (Machine)', sets: 3, repsRange: '8-10', targetWeight: 45, focus: 'Haut de pec' },
            { name: 'Chest Fly (Machine)', sets: 3, repsRange: '12-15', targetWeight: 45, focus: 'Étirement' },
            { name: 'Extension triceps (Poulie basse)', sets: 3, repsRange: '12-15', targetWeight: 30, focus: null },
            { name: 'Extension triceps (Poulie haute)', sets: 3, repsRange: '12-15', targetWeight: 18, focus: null },
            { name: 'Élévations latérales (Haltères)', sets: 4, repsRange: '15', targetWeight: 9, focus: 'Galbe' },
        ]
    },
    PULL: {
        label: 'PULL',
        emoji: '💪',
        description: 'Dos, Biceps — Épaisseur et bras',
        color: 'from-blue-500 to-cyan-500',
        exercises: [
            { name: 'Mid Row (Machine)', sets: 3, repsRange: '8-10', targetWeight: 55, focus: 'Épaisseur' },
            { name: 'Seated Cable Row (V-Grip)', sets: 3, repsRange: '10-12', targetWeight: 50, focus: 'Tirage horizontal' },
            { name: 'Oiseau à la poulie', sets: 3, repsRange: '15', targetWeight: 0, focus: 'Arrière épaule' },
            { name: 'Curl pupitre (Haltères)', sets: 3, repsRange: '10-12', targetWeight: 16, focus: 'Étirement biceps' },
            { name: 'Curl marteau (Haltères)', sets: 3, repsRange: '12', targetWeight: 18, focus: 'Brachial' },
        ]
    },
    LEGS: {
        label: 'LEGS',
        emoji: '🦵',
        description: 'Focus Quadriceps — Volume cuisses',
        color: 'from-green-500 to-emerald-500',
        exercises: [
            { name: 'Presse à cuisses (Pieds bas)', sets: 3, repsRange: '10-12', targetWeight: 70, focus: 'Quads' },
            { name: 'Presse unilatérale', sets: 3, repsRange: '10-12', targetWeight: 30, focus: 'Par jambe' },
            { name: 'Leg Extension', sets: 3, repsRange: '15', targetWeight: 55, focus: 'Contraction 2s' },
            { name: 'Leg Curl allongé', sets: 3, repsRange: '12-15', targetWeight: 40, focus: 'Maintenance' },
            { name: 'Mollets debout', sets: 4, repsRange: '15', targetWeight: 0, focus: null },
        ]
    },
    UPPER: {
        label: 'UPPER',
        emoji: '⬆️',
        description: 'Largeur & V-Taper — Silhouette en V',
        color: 'from-purple-500 to-indigo-500',
        exercises: [
            { name: 'Chest Press incliné (Machine)', sets: 3, repsRange: '8-10', targetWeight: 40, focus: null },
            { name: 'Tirage vertical uni (Poulie haute)', sets: 3, repsRange: '10-12', targetWeight: 30, focus: 'Grand dorsal' },
            { name: 'Machine Fly (Pec Deck)', sets: 3, repsRange: '12', targetWeight: 45, focus: null },
            { name: 'Pull-over (Poulie haute)', sets: 3, repsRange: '12-15', targetWeight: 32, focus: 'Largeur' },
            { name: 'Élévations latérales (Poulie)', sets: 3, repsRange: '15', targetWeight: 9, focus: null },
            { name: 'Curl pupitre (Haltères)', sets: 3, repsRange: '12', targetWeight: 16, focus: 'Superset avec triceps' },
            { name: 'Oiseau à la poulie', sets: 3, repsRange: '15', targetWeight: 0, focus: null },
        ]
    },
    LOWER: {
        label: 'LOWER',
        emoji: '⬇️',
        description: 'Ischios & Abdos — Chaîne postérieure',
        color: 'from-teal-500 to-green-500',
        exercises: [
            { name: 'SDT Jambes tendues (Haltères)', sets: 3, repsRange: '10-12', targetWeight: 0, focus: 'Ischios' },
            { name: 'Leg Curl allongé (Machine)', sets: 3, repsRange: '12-15', targetWeight: 0, focus: null },
            { name: 'Presse à cuisses (Pieds hauts)', sets: 3, repsRange: '10-12', targetWeight: 0, focus: 'Fessiers' },
            { name: 'Relevé de jambes (Suspendu)', sets: 3, repsRange: '15', targetWeight: 0, focus: 'Abdos' },
        ]
    },
    REPOS: {
        label: 'REPOS',
        emoji: '😴',
        description: 'Journée de récupération',
        color: 'from-gray-400 to-gray-500',
        exercises: []
    },
    MATCH: {
        label: 'MATCH / REPOS',
        emoji: '⚽',
        description: 'Jour de match — pas de musculation',
        color: 'from-yellow-500 to-amber-500',
        exercises: []
    }
}

// ══════════════════════════════════════
// PERSISTENCE (localStorage)
// ══════════════════════════════════════

const STORAGE_KEY = 'omnidash_workout_templates'

function loadTemplates() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            const parsed = JSON.parse(saved)
            // Deep merge: keep the structure from defaults, override only saved weights/sets/reps
            const merged = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES))
            for (const key of Object.keys(merged)) {
                if (parsed[key]?.exercises) {
                    merged[key].exercises = parsed[key].exercises.map((ex, i) => {
                        const savedEx = parsed[key].exercises[i]
                        if (savedEx) {
                            return { ...ex, ...savedEx }
                        }
                        return ex
                    })
                }
            }
            return merged
        }
    } catch (e) {
        console.warn('Failed to load templates from localStorage:', e)
    }
    return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES))
}

function saveTemplates(templates) {
    try {
        // Only save exercise data (not labels, colors etc.)
        const toSave = {}
        for (const key of Object.keys(templates)) {
            if (templates[key].exercises?.length > 0) {
                toSave[key] = {
                    exercises: templates[key].exercises.map(ex => ({
                        name: ex.name,
                        sets: ex.sets,
                        repsRange: ex.repsRange,
                        targetWeight: ex.targetWeight,
                        focus: ex.focus
                    }))
                }
            }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
        console.warn('Failed to save templates to localStorage:', e)
    }
}

// ══════════════════════════════════════
// COMPOSABLE
// ══════════════════════════════════════

export function useWorkoutPrograms() {
    const planningMode = ref('standard')
    const selectedDayIndex = ref(new Date().getDay())
    const templates = ref(loadTemplates())

    // Auto-save on any template change
    watch(templates, (val) => saveTemplates(val), { deep: true })

    const currentPlanning = computed(() => {
        return planningMode.value === 'standard' ? STANDARD_WEEK : MATCH_WEEK
    })

    const weekOverview = computed(() => {
        const planning = currentPlanning.value
        const order = [1, 2, 3, 4, 5, 6, 0]
        return order.map(dayIndex => ({
            dayIndex,
            ...planning[dayIndex],
            template: templates.value[planning[dayIndex].session]
        }))
    })

    const todayDayIndex = computed(() => new Date().getDay())

    const selectedPlan = computed(() => {
        const plan = currentPlanning.value[selectedDayIndex.value]
        if (!plan) return null
        return {
            ...plan,
            template: templates.value[plan.session]
        }
    })

    const isSelectedToday = computed(() => selectedDayIndex.value === todayDayIndex.value)

    const isRestDay = computed(() => {
        return selectedPlan.value?.session === 'REPOS' || selectedPlan.value?.session === 'MATCH'
    })

    const updateExerciseWeight = (sessionKey, exerciseIndex, newWeight) => {
        if (templates.value[sessionKey]?.exercises[exerciseIndex]) {
            templates.value[sessionKey].exercises[exerciseIndex].targetWeight = newWeight
        }
    }

    const generateBlocks = (templateName, exercisesDB) => {
        const template = templates.value[templateName]
        if (!template || template.exercises.length === 0) return []

        return template.exercises
            .map(tplEx => {
                const dbEx = exercisesDB.find(
                    e => e.name.trim().toLowerCase() === tplEx.name.trim().toLowerCase()
                )
                if (!dbEx) return null

                const defaultReps = parseInt(tplEx.repsRange.split('-')[0]) || 10
                const sets = []
                for (let i = 0; i < tplEx.sets; i++) {
                    sets.push({
                        weight: tplEx.targetWeight,
                        reps: defaultReps,
                        rpe: null
                    })
                }

                return { exercise_id: dbEx.id, sets }
            })
            .filter(Boolean)
    }

    return {
        planningMode,
        selectedDayIndex,
        todayDayIndex,
        currentPlanning,
        weekOverview,
        selectedPlan,
        isSelectedToday,
        isRestDay,
        templates,
        updateExerciseWeight,
        generateBlocks
    }
}
