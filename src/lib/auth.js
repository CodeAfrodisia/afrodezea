// lib/auth.js
import { supabase } from "./supabaseClient.js"

export async function getUserIdFromSession(req) {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.cookies?.sb_access_token
    if (!token) return null
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user.id
  } catch (err) {
    console.error("Auth Error:", err)
    return null
  }
}

