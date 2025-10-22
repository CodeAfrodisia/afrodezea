// src/types/quiz.d.ts
export type Quiz = {
  slug: string
  title: string
  category: string
  description: string
  is_published: boolean
  questions: {
    version: number
    min_required: number
    results: {
      key: string
      label: string
      headline: string
      summary: string
      guidance: string[]
      product_suggestions: { kind: string; sku: string; reason: string }[]
    }[]
    questions: {
      id: string
      prompt: string
      optional?: boolean
      options: { key: string; label: string; weights: Record<string, number> }[]
    }[]
  }
}

export type AttemptInsert = {
  quiz_slug: string
  user_id: string
  answers: Record<string,string>
  result_key: string
  result_totals: Record<string,number>
  is_public?: boolean
}

