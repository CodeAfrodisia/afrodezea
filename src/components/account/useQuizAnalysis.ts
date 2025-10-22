// src/components/account/useQuizAnalysis.ts
import useSWR from 'swr'

const fetcher = (url: string, body: any) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json())

export function useQuizAnalysis(userId: string | undefined, scope = 'quizzes') {
  const shouldFetch = Boolean(userId)
  const { data, isLoading, mutate, error } = useSWR(
    shouldFetch ? ['/api/analyze-quizzes', { userId, scope }] : null,
    ([url, body]) => fetcher(url, body),
    { revalidateOnFocus: false }
  )
  return {
    text: data?.text as string | undefined,
    cached: data?.cached as boolean | undefined,
    loading: isLoading,
    error,
    regenerate: async () => {
      await mutate(fetcher('/api/analyze-quizzes', { userId, scope, force: true }), { revalidate: false })
    },
  }
}

