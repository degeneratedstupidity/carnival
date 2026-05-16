import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
      return NextResponse.json({ suggestions: FALLBACK })
    }

    // Rate limit: 1 call per 15s per user
    const lastCall = rateLimitMap.get(userId) ?? 0
    if (Date.now() - lastCall < RATE_LIMIT_MS) {
      return NextResponse.json({ suggestions: FALLBACK, rateLimited: true })
    }
    rateLimitMap.set(userId, Date.now())

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ suggestions: FALLBACK })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
    })

    const prompt = `You are a goal-setting coach for a corporate HR portal.

Goal details:
- Title: ${goalTitle}
- Description: ${description || 'Not provided'}
- Unit of Measurement: ${uomType}
- Target value: ${targetValue ?? 'Not set'}
- Thrust area: ${thrustArea || 'Not specified'}

Return exactly 3 bullet points of concise, actionable feedback on this goal's specificity, measurability, and relevance. Each bullet must be under 20 words. Start each with a dash.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const suggestions = text
      .split('\n')
      .map(l => l.replace(/^[-•*]\s*/, '').trim())
      .filter(l => l.length > 0)
      .slice(0, 3)

    if (suggestions.length < 3) {
      return NextResponse.json({ suggestions: FALLBACK })
    }

    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ suggestions: FALLBACK })
  }
}
