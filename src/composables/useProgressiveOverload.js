import { ref } from 'vue'
import { supabase } from '@/supabase'

export function useProgressiveOverload() {
  // exerciseId -> [{ date, sets: [{weight, reps}] }] sorted most-recent first
  const exerciseHistory = ref({})
  const fetchedIds = new Set()

  const fetchHistoryForExercises = async (userId, exerciseIds) => {
    if (!userId || !exerciseIds.length) return

    const newIds = exerciseIds.filter(id => id && !fetchedIds.has(id))
    if (!newIds.length) return

    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(20)

    if (!workouts?.length) {
      newIds.forEach(id => fetchedIds.add(id))
      return
    }

    const workoutIds = workouts.map(w => w.id)
    const dateMap = Object.fromEntries(workouts.map(w => [w.id, w.date]))

    const { data: sets } = await supabase
      .from('workout_sets')
      .select('exercise_id, workout_id, weight, reps')
      .in('workout_id', workoutIds)
      .in('exercise_id', newIds)

    newIds.forEach(id => fetchedIds.add(id))
    if (!sets?.length) return

    const grouped = {}
    sets.forEach(s => {
      if (!grouped[s.exercise_id]) grouped[s.exercise_id] = {}
      if (!grouped[s.exercise_id][s.workout_id]) {
        grouped[s.exercise_id][s.workout_id] = { date: dateMap[s.workout_id], sets: [] }
      }
      grouped[s.exercise_id][s.workout_id].sets.push({ weight: s.weight, reps: s.reps })
    })

    const updated = { ...exerciseHistory.value }
    for (const exId of Object.keys(grouped)) {
      updated[exId] = Object.values(grouped[exId])
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    }
    exerciseHistory.value = updated
  }

  const getLastSession = (exerciseId) => {
    return exerciseHistory.value[exerciseId]?.[0] || null
  }

  // Returns { status, label, detail, lastPerf, suggestedWeight } or null
  const getOverloadStatus = (exerciseId, repsRange) => {
    if (!exerciseId || !repsRange) return null
    const sessions = exerciseHistory.value[exerciseId]

    if (!sessions?.length) {
      return { status: 'START', label: '1ère séance', detail: null, lastPerf: null, suggestedWeight: null }
    }

    const last = sessions[0]
    const sets = last.sets.filter(s => s.reps != null)
    if (!sets.length) return null

    // Parse "8-10", "12-15", "15", "30-45s" → [min, max]
    const nums = repsRange.replace(/[^0-9-]/g, '').split('-').map(Number).filter(Boolean)
    if (!nums.length) return null
    const minReps = nums[0]
    const maxReps = nums[nums.length - 1]

    const weights = sets.map(s => s.weight || 0)
    const maxW = Math.max(...weights)
    const allSameWeight = weights.every(w => w === weights[0])
    const lastPerf = allSameWeight
      ? `${maxW > 0 ? maxW + 'kg' : 'PDC'} · ${sets.map(s => s.reps).join('/')} reps`
      : `${weights[0]}→${weights[weights.length - 1]}kg · ${sets.map(s => s.reps).join('/')} reps`

    // Descending sets (dégressives): weights differ between sets
    // Goal is to equalize before increasing — never trigger INCREASE
    if (!allSameWeight) {
      const topSetReps = sets[0].reps
      return {
        status: topSetReps >= minReps ? 'PROGRESS' : 'CONSOLIDATE',
        label: topSetReps >= minReps ? 'En progression' : 'Consolider',
        detail: '→ Égalise les charges avant d\'augmenter',
        lastPerf,
        suggestedWeight: null
      }
    }

    if (sets.every(s => s.reps >= maxReps)) {
      const suggestedWeight = maxW > 0 ? maxW + 2.5 : null
      return {
        status: 'INCREASE',
        label: 'Augmenter',
        detail: suggestedWeight ? `→ Essaie ${suggestedWeight}kg` : '→ Ajoute de la résistance',
        lastPerf,
        suggestedWeight
      }
    } else if (sets.every(s => s.reps >= minReps)) {
      return {
        status: 'PROGRESS',
        label: 'En progression',
        detail: `→ Vise ${maxReps} reps`,
        lastPerf,
        suggestedWeight: null
      }
    } else {
      return {
        status: 'CONSOLIDATE',
        label: 'Consolider',
        detail: `→ ≥ ${minReps} reps min`,
        lastPerf,
        suggestedWeight: null
      }
    }
  }

  return { exerciseHistory, fetchHistoryForExercises, getLastSession, getOverloadStatus }
}
