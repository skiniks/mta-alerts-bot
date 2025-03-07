import { PostgrestClient } from '@supabase/postgrest-js'
import { SUPABASE_KEY, SUPABASE_URL } from '../config/index.js'

export const postgrest = new PostgrestClient(`${SUPABASE_URL}/rest/v1`, {
  headers: {
    apikey: SUPABASE_KEY!,
    Authorization: `Bearer ${SUPABASE_KEY!}`,
  },
})
