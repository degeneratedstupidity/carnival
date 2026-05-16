export const GOAL_RULES = {
  MAX_GOALS: 8,
  MIN_WEIGHT: 10,
  TOTAL_WEIGHT: 100,
} as const

export function validateGoalSet(goals: { weightage: number }[]): string[] {
  const errors: string[] = []

  if (goals.length > GOAL_RULES.MAX_GOALS) {
    errors.push(`You can add a maximum of ${GOAL_RULES.MAX_GOALS} goals.`)
  }

  const total = goals.reduce((sum, g) => sum + g.weightage, 0)
  if (total !== GOAL_RULES.TOTAL_WEIGHT) {
    errors.push(`Total weightage must equal 100%. Currently at ${total}%.`)
  }

  const underMin = goals.filter((g) => g.weightage < GOAL_RULES.MIN_WEIGHT)
  if (underMin.length > 0) {
    errors.push(`Each goal needs at least ${GOAL_RULES.MIN_WEIGHT}% weightage.`)
  }

  return errors
}

export function getRemainingWeightage(goals: { weightage: number }[]): number {
  const used = goals.reduce((sum, g) => sum + g.weightage, 0)
  return GOAL_RULES.TOTAL_WEIGHT - used
}
