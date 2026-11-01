// POST { reference } — re-checks a payment with Paystack and returns the server-side result.
import { handleVerify } from '../_shared/core.ts'
import { serve } from '../_shared/supabase.ts'

serve(handleVerify)
