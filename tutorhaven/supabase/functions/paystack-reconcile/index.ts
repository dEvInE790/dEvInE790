// POST {} — admins only. Re-checks pending payments with Paystack in case a webhook was missed.
import { handleReconcile } from '../_shared/core.ts'
import { serve } from '../_shared/supabase.ts'

serve(handleReconcile)
