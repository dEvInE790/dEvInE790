// Paystack server-to-server events (deploy with --no-verify-jwt). Signature-checked and idempotent.
import { handleWebhook } from '../_shared/core.ts'
import { serve } from '../_shared/supabase.ts'

serve(handleWebhook)
