import { UoMType } from '@/types'

export function computeScore(
  uomType: UoMType,
  target: number | null,
  actual: number | null,
  targetDate?: string | null,
  actualDate?: string | null
): number {
  if (actual === null || actual === undefined) return 0

  switch (uomType) {
    case 'min_numeric':
    case 'min_percent':
      if (!target || target === 0) return 0
      return Math.min((actual / target) * 100, 150)

    case 'max_numeric':
    case 'max_percent':
      if (!target) return 0
      if (actual === 0) return 100
      return Math.min((target / actual) * 100, 150)

    case 'timeline': {
      if (!targetDate || !actualDate) return 0
      const deadline = new Date(targetDate).getTime()
      const completed = new Date(actualDate).getTime()
      const daysLate = Math.floor((completed - deadline) / (1000 * 60 * 60 * 24))
      return daysLate <= 0 ? 100 : Math.max(0, 100 - daysLate * 5)
    }

    case 'zero':
      return actual === 0 ? 100 : 0

    default:
      return 0
  }
}

export function computeWeightedScore(
  goals: { computedScore: number | null; weightage: number }[]
): number {
  if (goals.length === 0) return 0
  const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0)
  if (totalWeight === 0) return 0
  return goals.reduce((sum, g) => sum + ((g.computedScore ?? 0) * g.weightage) / totalWeight, 0)
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

export function uomLabel(uomType: UoMType): string {
  const labels: Record<UoMType, string> = {
    min_numeric: 'Higher is better (number)',
    max_numeric: 'Lower is better (number)',
    min_percent: 'Higher is better (%)',
    max_percent: 'Lower is better (%)',
    timeline: 'Date-based completion',
    zero: 'Zero = success',
  }
  return labels[uomType] ?? uomType
}
