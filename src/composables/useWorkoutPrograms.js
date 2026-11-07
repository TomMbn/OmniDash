import { computed, nextTick, ref, watch } from 'vue'
import { localDay, mondayOf } from '@/utils/date'
import { supabase } from '@/supabase'
import { useAuth } from '@/composables/useAuth'

// ══════════════════════════════════════
// PLANNING HEBDOMADAIRES
// ══════════════════════════════════════

export const STANDARD_WEEK = {
    1: { label: 'Lundi', session: 'CARDIO' },
    2: { label: 'Mardi', session: 'PUSH' },
    3: { label: 'Mercredi', session: 'PULL' },
    4: { label: 'Jeudi', session: 'LEGS' },
    5: { label: 'Vendredi', session: 'CARDIO' },
    6: { label: 'Samedi', session: 'UPPER' },
    0: { label: 'Dimanche', session: 'LOWER' },
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
// TEMPLATES DE SÉANCES — Plan v5
// ══════════════════════════════════════

const DEFAULT_TEMPLATES = {
    PUSH: {
        label: 'Push',
        emoji: '🔥',
        description: 'Pecs, Épaules & Triceps',
        color: 'from-red-500 to-orange-500',
        exercises: [
            { name: 'Chest press incliné machine', sets: 3, repsRange: '8-10', targetWeight: 45, restTime: '2–3 min', note: 'Focus haut du pec · double progression prioritaire', section: 'Pectoraux' },
            { name: 'Chest fly machine', sets: 3, repsRange: '12-15', targetWeight: 45, restTime: '90 s', note: 'Focus étirement · contraction 1 s en haut', section: 'Pectoraux' },
            { name: 'Extension triceps poulie basse', sets: 3, repsRange: '12-15', targetWeight: 30, restTime: '90 s', section: 'Triceps' },
            { name: 'Extension triceps poulie haute', sets: 3, repsRange: '12-15', targetWeight: 18, restTime: '90 s', section: 'Triceps' },
            { name: 'Élévations latérales haltères', sets: 4, repsRange: '15', targetWeight: 9, restTime: '60 s', note: 'Focus galbe · excentrique 4 s · rest-pause sur série 4', section: 'Épaules' },
        ]
    },
    PULL: {
        label: 'Pull',
        emoji: '💪',
        description: 'Dos & Biceps — V-taper prioritaire',
        color: 'from-blue-500 to-cyan-500',
        exercises: [
            { name: 'Lat pulldown', sets: 4, repsRange: '8-10', targetWeight: 0, restTime: '2–3 min', note: 'Focus galbe · amplitude maximale · étirer le grand dorsal en haut', section: 'Grand dorsal' },
            { name: 'Mid row machine', sets: 3, repsRange: '8-10', targetWeight: 55, restTime: '2 min', note: 'Focus épaisseur', section: 'Épaisseur dos' },
            { name: 'Tirage horizontal V-grip', sets: 3, repsRange: '10-12', targetWeight: 50, restTime: '90 s', note: 'Focus tirage horizontal', section: 'Épaisseur dos' },
            { name: 'Face pulls / oiseau poulie', sets: 3, repsRange: '15', targetWeight: 0, restTime: '45 s', note: 'Focus arrière épaule · correction protraction', section: 'Épaules & Biceps' },
            { name: 'Curl pupitre haltères', sets: 3, repsRange: '10-12', targetWeight: 16, restTime: '90 s', note: 'Focus étirement biceps', section: 'Épaules & Biceps' },
            { name: 'Curl marteau haltères', sets: 3, repsRange: '12', targetWeight: 18, restTime: '60 s', note: 'Focus brachial', section: 'Épaules & Biceps' },
        ]
    },
    LEGS: {
        label: 'Legs',
        emoji: '🦵',
        description: 'Focus Quadriceps · Ischios · Épaules',
        color: 'from-green-500 to-emerald-500',
        exercises: [
            { name: 'Presse pieds bas', sets: 3, repsRange: '10-12', targetWeight: 70, restTime: '2 min', note: 'Focus quads · surveiller adducteurs', section: 'Quadriceps' },
            { name: 'Presse unilatérale', sets: 3, repsRange: '10-12', targetWeight: 0, restTime: '2 min', note: 'Par jambe · surveiller adducteurs', section: 'Quadriceps' },
            { name: 'Leg extension', sets: 3, repsRange: '15', targetWeight: 55, restTime: '60 s', note: 'Contraction 2 s en haut', section: 'Quadriceps' },
            { name: 'Leg curl allongé', sets: 4, repsRange: '12-15', targetWeight: 40, restTime: '90 s', note: 'Maintenance ischios', section: 'Ischios & Mollets' },
            { name: 'Mollets debout', sets: 4, repsRange: '15', targetWeight: 0, restTime: '60 s', note: 'Noter la charge à chaque séance', section: 'Ischios & Mollets' },
            { name: 'Élévations latérales haltères', sets: 4, repsRange: '15', targetWeight: 9, restTime: '60 s', note: 'Focus galbe · excentrique 4 s · drop set sur dernière série', section: 'Épaules' },
            { name: 'Face pulls / oiseau poulie', sets: 4, repsRange: '15', targetWeight: 0, restTime: '45 s', note: 'Focus arrière épaule · deltoïde postérieur', section: 'Épaules' },
        ]
    },
    UPPER: {
        label: 'Upper',
        emoji: '⬆️',
        description: 'Largeur & V-Taper',
        color: 'from-purple-500 to-indigo-500',
        exercises: [
            { name: 'Chest press machine', sets: 3, repsRange: '8-10', targetWeight: 0, restTime: '2 min', section: 'Pectoraux & Dos' },
            { name: 'Tirage vertical unilatéral poulie haute', sets: 3, repsRange: '10-12', targetWeight: 0, restTime: '90 s', note: 'Focus grand dorsal', section: 'Pectoraux & Dos' },
            { name: 'Machine fly pec deck', sets: 3, repsRange: '12', targetWeight: 0, restTime: '90 s', section: 'Pectoraux & Dos' },
            { name: 'Pull-over poulie haute', sets: 3, repsRange: '12-15', targetWeight: 32, restTime: '90 s', note: 'Focus largeur grand dorsal', section: 'Grand dorsal' },
            { name: 'Élévations latérales poulie', sets: 4, repsRange: '15', targetWeight: 9, restTime: '60 s', note: '1,5 reps séries 1–2 · excentrique 4 s séries 3–4 · drop set série 5', section: 'Deltoïdes' },
            { name: 'Superset curl + extension triceps', sets: 3, repsRange: '12', targetWeight: 0, restTime: '60 s', note: 'Enchaîner sans repos entre les deux exercices', section: 'Prévention & Finition' },
            { name: 'Face pulls / oiseau poulie', sets: 3, repsRange: '15', targetWeight: 0, restTime: '45 s', note: 'Focus arrière épaule', section: 'Prévention & Finition' },
        ]
    },
    LOWER: {
        label: 'Lower',
        emoji: '⬇️',
        description: 'Ischios, Fessiers & Abdos — Chaîne postérieure',
        color: 'from-teal-500 to-green-500',
        exercises: [
            { name: 'Leg curl allongé machine', sets: 3, repsRange: '12-15', targetWeight: 0, restTime: '90 s', section: 'Chaîne postérieure' },
            { name: 'Hip thrust machine', sets: 3, repsRange: '12', targetWeight: 0, restTime: '90 s', note: 'Antagoniste du psoas · clé antéversion', section: 'Chaîne postérieure' },
            { name: 'SDT roumain haltères', sets: 3, repsRange: '10-12', targetWeight: 0, restTime: '2–3 min', note: 'Focus ischios · noter la charge systématiquement', section: 'SDT' },
            { name: 'Presse pieds bas', sets: 3, repsRange: '10-12', targetWeight: 0, restTime: '2 min', note: 'Surveiller adducteurs', section: 'Quadriceps' },
            { name: 'Relevés de jambes suspendu', sets: 3, repsRange: '15', targetWeight: 0, restTime: '45 s', note: 'Poids de corps · bas du ventre · V-line', section: 'Abdos en salle' },
        ]
    },
    CARDIO: {
        label: 'Cardio',
        emoji: '🏃',
        description: 'Récupération active · Zone 1–2 · 110–130 bpm · 35–40 min',
        isCardio: true,
        color: 'from-teal-500 to-cyan-500',
        cardioOptions: [
            { name: 'Vélo de salle', duration: '35–40 min', note: 'Résistance 2–3 · 90–100 rpm · récupération active jambes' },
            { name: 'Elliptique', duration: '35–40 min', note: 'Résistance modérée · protection jambes · sollicitation quadriceps moindre' },
            { name: 'Marche rapide extérieur', duration: '40 min', note: '6,5–7 km/h · terrain plat · idéal lendemain de Legs lourd' },
        ],
        exercises: []
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
// PERSISTANCE
// Le compte (table user_settings) fait foi pour partager entre les appareils.
// Le navigateur garde une copie pour l'affichage immédiat et le hors-ligne.
// ══════════════════════════════════════

const STORAGE_KEY = 'omnidash_workout_templates_v3'
const PLANNING_KEY = 'omnidash_planning_mode'

// Ne garde que ce que l'utilisateur peut modifier
function serializeTemplates(templates) {
    const out = {}
    for (const key of Object.keys(templates)) {
        if (templates[key].exercises?.length > 0) {
            out[key] = {
                exercises: templates[key].exercises.map(ex => ({
                    name: ex.name,
                    sets: ex.sets,
                    repsRange: ex.repsRange,
                    targetWeight: ex.targetWeight,
                    restTime: ex.restTime,
                    note: ex.note,
                    section: ex.section,
                    focus: ex.focus
                }))
            }
        }
    }
    return out
}

// Applique une sauvegarde sur les modèles par défaut
function mergeTemplates(saved) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES))
    if (!saved) return merged
    for (const key of Object.keys(merged)) {
        if (saved[key]?.exercises) {
            merged[key].exercises = merged[key].exercises.map((ex, i) => {
                const savedEx = saved[key].exercises[i]
                return savedEx ? { ...ex, ...savedEx } : ex
            })
        }
    }
    return merged
}

const readLocal = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') } catch (e) { return null }
}

const writeLocal = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch (e) {}
}

const currentWeek = () => localDay(mondayOf())

// La semaine de match ne vaut que pour la semaine où elle a été choisie
const modeFor = (mode, week) => (mode === 'match' && week === currentWeek() ? 'match' : 'standard')

const localPlanning = readLocal(PLANNING_KEY)
const planningMode = ref(modeFor(localPlanning?.mode, localPlanning?.week))
const templates = ref(mergeTemplates(readLocal(STORAGE_KEY)))

// ── Synchronisation avec le compte ──
let syncedUserId = null
let applyingRemote = false
let templatesTimer = null

const saveRemote = async (fields) => {
    if (!syncedUserId) return
    const { error } = await supabase.from('user_settings').upsert({ user_id: syncedUserId, ...fields }, { onConflict: 'user_id' })
    if (error) console.warn('Synchronisation du programme impossible :', error.message)
}

const loadRemote = async (userId) => {
    const { data, error } = await supabase
        .from('user_settings')
        .select('planning_mode, planning_week, workout_templates')
        .eq('user_id', userId)
        .maybeSingle()
    // Colonnes absentes ou réseau coupé : on reste sur la copie locale
    if (error) {
        console.warn('Programme non synchronisé :', error.message)
        return
    }
    syncedUserId = userId
    applyingRemote = true
    if (data?.planning_week) planningMode.value = modeFor(data.planning_mode, data.planning_week)
    if (data?.workout_templates) templates.value = mergeTemplates(data.workout_templates)
    // Les watchers passent au tick suivant : on attend avant de réactiver l'envoi
    await nextTick()
    applyingRemote = false
    // Première synchronisation : le compte reprend ce que cet appareil avait en local
    const fields = {}
    if (!data?.workout_templates && readLocal(STORAGE_KEY)) fields.workout_templates = serializeTemplates(templates.value)
    if (!data?.planning_week && planningMode.value === 'match') Object.assign(fields, { planning_mode: 'match', planning_week: currentWeek() })
    if (Object.keys(fields).length) await saveRemote(fields)
}

watch(planningMode, (mode) => {
    const week = currentWeek()
    writeLocal(PLANNING_KEY, { mode, week })
    if (!applyingRemote) saveRemote({ planning_mode: mode, planning_week: week })
})

watch(templates, (val) => {
    const saved = serializeTemplates(val)
    writeLocal(STORAGE_KEY, saved)
    if (applyingRemote) return
    clearTimeout(templatesTimer)
    templatesTimer = setTimeout(() => saveRemote({ workout_templates: saved }), 800)
}, { deep: true })

const { user } = useAuth()
watch(user, (u) => {
    if (u?.id && u.id !== syncedUserId) loadRemote(u.id)
    if (!u) syncedUserId = null
}, { immediate: true })

// ══════════════════════════════════════
// COMPOSABLE
// ══════════════════════════════════════

export function useWorkoutPrograms() {
    const selectedDayIndex = ref(new Date().getDay())

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
