// POST { kind, booking_id?, plan_id?, redirect_url } — starts a server-priced Paystack checkout.
import { handleInit } from '../_shared/core.ts'
import { serve } from '../_shared/supabase.ts'

serve(handleInit)
