import { supabase } from "@lib/supabaseClient.js"

export async function getUserIdFromSession() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

