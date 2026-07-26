# Beer Scramble

Mobile-first realtime tournament management for scramble golf with beer bonus
scoring and birdie juice debt rules.

## Current Status

Milestone 1 foundation is implemented:

- Next.js App Router + TypeScript + Tailwind scaffold
- Core business-logic helpers in `lib/`
- Domain types in `types/`
- Initial Supabase schema migration in `supabase/migrations/`
- Supabase client bootstrap in `lib/supabase.ts`

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set environment variables:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

4. Build for production checks:

   ```bash
   npm run build
   ```
