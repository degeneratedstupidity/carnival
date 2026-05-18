import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 15_000

const UOM_LABELS: Record<string, string> = {
  min_numeric: 'higher is better — score = actual ÷ target',
  max_numeric: 'lower is better — score = target ÷ actual',
  min_percent: 'higher is better — score = actual % ÷ target %',
  max_percent: 'lower is better — score = target % ÷ actual %',
  timeline: 'date-based — 100% if on/before deadline, −5% per day late',
  zero: 'zero incidents = 100%, any incident = 0%',
}

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
    const { userId, goalId, goalTitle, uomType, targetValue, targetDate, actualValue, actualDate, score, quarter } = await request.json()

    if (!userId || !goalTitle) {
      return NextResponse.json({ coaching: null })
    }

    // Rate limit: 1 call per 15s per user+goal pair
    const key = `${userId}:${goalId ?? goalTitle}`
    const lastCall = rateLimitMap.get(key) ?? 0
    if (Date.now() - lastCall < RATE_LIMIT_MS) {
      return NextResponse.json({ coaching: null, rateLimited: true })
    }
    rateLimitMap.set(key, Date.now())

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ coaching: null })
    }

    const ai = new GoogleGenAI({ apiKey })

    const targetStr = targetValue != null
      ? `${targetValue}${uomType?.includes('percent') ? '%' : ''}`
      : targetDate ?? 'not set'

    const actualStr = actualValue != null
      ? `${actualValue}${uomType?.includes('percent') ? '%' : ''}`
      : actualDate ?? 'not recorded'

    const prompt = `You are a performance coach reviewing an employee's quarterly check-in in a corporate goal tracking system.

Goal: ${goalTitle}
Measurement: ${UOM_LABELS[uomType] ?? uomType}
Target: ${targetStr}
Actual: ${actualStr}
Score: ${Math.round(score)}%
Quarter: ${String(quarter).toUpperCase()}

Write exactly 1–2 sentences of coaching. Be specific — use the actual numbers from above.
Tell them whether they are on track, ahead, or behind, and give one concrete next step.
Do not mention "check-ins", "logging", "tracking", or "systems" — focus only on the work itself.
Plain English. Under 40 words total. No bullet points, no headers.`

    const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite']
    let text = ''
    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({ model: modelName, contents: prompt })
        text = response.text?.trim() ?? ''
        if (text) break
      } catch (modelErr) {
        console.warn(`[AI route] Model ${modelName} failed:`, modelErr instanceof Error ? modelErr.message : modelErr)
      }
    }

    if (!text) return NextResponse.json({ coaching: null })
    return NextResponse.json({ coaching: text })
  } catch (err) {
    console.error('[AI route] Gemini call failed:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ coaching: null })
  }
}
