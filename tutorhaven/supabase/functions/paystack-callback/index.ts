// Paystack returns the browser here (deploy with --no-verify-jwt); verifies, then redirects to the app.
import { handleCallback } from '../_shared/core.ts'
import { serve } from '../_shared/supabase.ts'

serve(handleCallback)
