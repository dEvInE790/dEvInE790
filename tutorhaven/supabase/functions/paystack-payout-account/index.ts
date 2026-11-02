// POST { action: 'banks' | 'resolve' | 'save', bank_code?, account_number? } — tutors connect their payout bank account.
import { handlePayoutAccount } from '../_shared/core.ts'
import { serve } from '../_shared/supabase.ts'

serve(handlePayoutAccount)
