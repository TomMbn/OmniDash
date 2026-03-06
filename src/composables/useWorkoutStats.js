import { computed } from 'vue'

export function useWorkoutStats(setsRef, exercisesRef, muscleGroupsRef) {
    const volumeLoadByMuscleGroup = computed(() => {
        const result = {}
        if (!setsRef.value || !exercisesRef.value || !muscleGroupsRef.value) return result

        setsRef.value.forEach(set => {
            // Ignore sets without actual data that adds to volume load
            if (!set.exercise_id || !set.weight || !set.reps) return

            const exercise = exercisesRef.value.find(e => e.id === set.exercise_id)
            if (exercise) {
                const muscleGroup = muscleGroupsRef.value.find(m => m.id === exercise.muscle_group_id)
                if (muscleGroup) {
                    const groupName = muscleGroup.name
                    const volume = set.reps * set.weight

                    if (!result[groupName]) {
                        result[groupName] = 0
                    }
                    result[groupName] += volume
                }
            }
        })

        return result
    })

    return {
        volumeLoadByMuscleGroup
    }
}
