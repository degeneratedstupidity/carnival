import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 15_000

const FALLBACK = [
  'Make the goal more specific by adding a numeric target or measurable milestone.',
  'Clarify how progress will be tracked — add a unit of measurement and a review date.',
  'Ensure the goal directly ties to a team or department priority for this cycle.',
]

export async function POST(request: Request) {
  try {
    const { userId, goalTitle, description, uomType, targetValue, thrustArea } = await request.json()

    if (!userId || !goalTitle) {
      return NextResponse.json({ suggestions: FALLBACK, fallback: true })
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
      return NextResponse.json({ suggestions: FALLBACK, fallback: true })
    }

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `You are a goal-setting coach for a corporate HR portal.

Goal details:
- Title: ${goalTitle}
- Description: ${description || 'Not provided'}
- Unit of Measurement: ${uomType}
- Target value: ${targetValue ?? 'Not set'}
- Thrust area: ${thrustArea || 'Not specified'}

Return exactly 3 bullet points of concise, actionable feedback on this goal's specificity, measurability, and relevance. Each bullet must be under 20 words. Start each with a dash.`

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    })

    const text = response.text ?? ''

    const suggestions = text
      .split('\n')
      .map((l: string) => l.replace(/^[-•*]\s*/, '').trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 3)

    if (suggestions.length < 3) {
      console.error('[AI route] Unexpected response format:', text)
      return NextResponse.json({ suggestions: FALLBACK, fallback: true })
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[AI route] Gemini call failed:', err)
    return NextResponse.json({ suggestions: FALLBACK, fallback: true })
  }
}
