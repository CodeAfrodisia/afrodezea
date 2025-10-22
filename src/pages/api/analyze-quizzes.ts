import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, scope = 'quizzes', force = false } = req.body as { userId: string; scope?: string; force?: boolean }
    if (!userId) return res.status(400).json({ error: 'userId required' })

    // 1) Pull latest attempts
    const { data: attempts, error } = await supabase
      .from('quiz_attempts_latest')
      .select('quiz_slug, result_key, result_title, result_summary, result_totals, quiz:quizzes(title)')
      .eq('user_id', userId)

    if (error) throw error

    // 2) Build a compact, stable representation & hash
    const compact = (attempts ?? []).map(a => ({
      slug: a.quiz_slug,
      title: a.quiz?.title ?? a.quiz_slug,
      key: a.result_key,
      t: a.result_title,
      s: a.result_summary,
      totals: a.result_totals ?? null,
    }))
    const sourceHash = crypto.createHash('sha256').update(JSON.stringify(compact)).digest('hex')

    // 3) Cache check
    if (!force) {
      const { data: cached } = await supabase
        .from('user_quiz_analyses')
        .select('text')
        .eq('user_id', userId)
        .eq('scope', scope)
        .eq('source_hash', sourceHash)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached?.text) return res.status(200).json({ text: cached.text, cached: true })
    }

    // 4) Build prompt (short + structured)
    const prompt = [
      'You are a warm, concise coach. Read these latest quiz results and write a short, kind synthesis.',
      'Return 3 sections: "Patterns", "Strengths", "One gentle next step".',
      'Use one paragraph per section. Avoid jargon. Keep it under 180 words total.',
      '',
      'Results JSON:',
      JSON.stringify(compact, null, 2),
    ].join('\n')

    // 5) Call LLM (adjust model as you like)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })
    const text = completion.choices[0]?.message?.content?.trim() || 'No analysis available.'

    // 6) Store + return
    await supabase.from('user_quiz_analyses').insert({ user_id: userId, scope, text, source_hash: sourceHash })
    return res.status(200).json({ text, cached: false })
  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message || 'failed' })
  }
}

