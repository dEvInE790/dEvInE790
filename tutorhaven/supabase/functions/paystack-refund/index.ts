// POST { payment_id } — admins only. Refunds through Paystack; the refund webhook completes it.
import { handleRefund } from '../_shared/core.ts'
import { serve } from '../_shared/supabase.ts'

serve(handleRefund)
