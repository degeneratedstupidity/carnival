import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 15_000

const FALLBACK = [
  'Make the goal more specific by adding a numeric target or measurable milestone.',
  'Clarify how progress will be tracked — add a unit of measurement and a review date.',
  'Ensure the goal directly ties to a team or department priority for this cycle.',
]

// Debug GET — visit /api/ai in browser to check key status
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY
  return NextResponse.json({
    keySet: !!apiKey,
    keyPrefix: apiKey ? apiKey.slice(0, 8) + '...' : null,
  })
}

export async function POST(request: Request) {
  try {
    const { userId, goalTitle, description, uomType, targetValue, targetDate, thrustArea } = await request.json()

    if (!userId || !goalTitle) {
      return NextResponse.json({ suggestions: FALLBACK, fallback: true, reason: 'missing_fields' })
    }

    // Rate limit: 1 call per 15s per user
    const lastCall = rateLimitMap.get(userId) ?? 0
    if (Date.now() - lastCall < RATE_LIMIT_MS) {
      return NextResponse.json({ suggestions: FALLBACK, fallback: true, rateLimited: true })
    }
    rateLimitMap.set(userId, Date.now())

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[AI route] GEMINI_API_KEY is not set')
      return NextResponse.json({ suggestions: FALLBACK, fallback: true, reason: 'no_key' })
    }

    const ai = new GoogleGenAI({ apiKey })

    const UOM_LABELS: Record<string, string> = {
      min_numeric: 'minimize a number (lower is better)',
      max_numeric: 'maximize a number (higher is better)',
      min_percent: 'minimize a percentage (lower is better)',
      max_percent: 'maximize a percentage (higher is better)',
      timeline: 'complete by a deadline',
      zero: 'zero incidents (binary pass/fail)',
    }
    const targetStr = targetValue != null
      ? `${targetValue}${uomType?.includes('percent') ? '%' : ''}`
      : targetDate
      ? `by ${targetDate}`
      : 'not set'

    const prompt = `You are a goal-setting coach reviewing an employee goal in a corporate HR performance system.

The system already handles: quarterly check-ins to log actuals, weightage scoring, and achievement computation. Do NOT suggest adding tracking, check-ins, or measurement systems — those are built in.
Each goal is already assigned to the employee who created it — do not suggest defining an owner or assigning responsibility.

Goal:
- Title: ${goalTitle}
- Description: ${description || '(none provided)'}
- Measurement type: ${UOM_LABELS[uomType] ?? uomType}
- Target: ${targetStr}
- Strategic area: ${thrustArea || 'not specified'}

Give exactly 3 short coaching comments. Focus on:
1. Whether the target (${targetStr}) is ambitious enough or too conservative — reference the actual number
2. Whether the description is specific enough — does it define what counts as success beyond the number?
3. One missing element that could cause this goal to fail: a baseline, a dependency, a risk, or an owner

Rules:
- Each comment must be under 20 words
- Be specific, not generic — mention the goal title or number
- Do NOT say "add a target", "track progress", or "add a measurement" — already done
- Start each line with a dash (-)
- Do not number the lines or add headers`

    // Try models in order — lite is more likely on free tier
    const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite']
    let text = ''
    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({ model: modelName, contents: prompt })
        text = response.text ?? ''
        if (text) break
      } catch (modelErr) {
        console.warn(`[AI route] Model ${modelName} failed:`, modelErr instanceof Error ? modelErr.message : modelErr)
      }
    }
    if (!text) throw new Error('All models failed')

    const suggestions = text
      .split('\n')
      .map((l: string) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 3)

    if (suggestions.length < 3) {
      console.error('[AI route] Unexpected response format:', text)
      return NextResponse.json({ suggestions: FALLBACK, fallback: true, reason: 'bad_format', raw: text })
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[AI route] Gemini call failed:', msg)
    return NextResponse.json({ suggestions: FALLBACK, fallback: true, reason: 'exception', error: msg })
  }
}
