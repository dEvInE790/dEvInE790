// Starts the local test stack for manual testing of the real app with a simulated Paystack.
//   sudo bash supabase/tests/db/setup.sh       (once: local Postgres with the migrations)
//   npm run stack -- --fixture                 (optional: test accounts, password test-password-123)
//   VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=local-stack-anon-key-not-a-secret-0123456789 npm run dev
import { startStack } from './server.mjs'
import { seedFixture, PASSWORD } from './fixture.mjs'

const stack = await startStack({ appUrls: process.env.APP_URLS ?? 'http://localhost:5173,http://localhost:4173' })
console.log(`Local stack on ${stack.url} (anon key: ${stack.anonKey})`)
if (process.argv.includes('--fixture')) {
  const f = await seedFixture(stack)
  console.log('Test accounts (password ' + PASSWORD + '):', Object.values(f).map((u) => u.email).join(', '))
}
console.log('Paystack is simulated: checkout opens a local test page. Press Ctrl+C to stop.')
