import Link from "next/link";
import TournamentSetupClient from "@/components/tournament-setup-client";

export default function TournamentPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Tournament Hub</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Tournament setup is now wired to Supabase for courses, tee sets, holes,
          players, tournaments, and teams.
        </p>
      </header>

      <TournamentSetupClient />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          className="rounded-lg border border-zinc-200 p-4 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          href="/leaderboard"
        >
          Leaderboard
        </Link>
        <Link
          className="rounded-lg border border-zinc-200 p-4 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          href="/tournament/live"
        >
          Live Tournament
        </Link>
        <Link
          className="rounded-lg border border-zinc-200 p-4 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          href="/draft"
        >
          Draft
        </Link>
        <Link
          className="rounded-lg border border-zinc-200 p-4 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          href="/stats"
        >
          Player Stats
        </Link>
      </section>
    </main>
  );
}
