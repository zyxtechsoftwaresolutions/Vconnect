import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

// Single GoTrueClient instance to avoid "Multiple GoTrueClient instances" warning
const globalKey = '__viet_connect_supabase_client'
const existing = (typeof globalThis !== 'undefined' && (globalThis as any)[globalKey]) as SupabaseClient | undefined
export const supabase = existing ?? (() => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { storageKey: 'viet-connect-auth' }
  })
  if (typeof globalThis !== 'undefined') (globalThis as any)[globalKey] = client
  return client
})()

// Admin client for privileged operations (uses service role key)
// Uses different storage key to avoid "Multiple GoTrueClient instances" warning
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'viet-connect-admin-auth'
      }
    })
  : null
