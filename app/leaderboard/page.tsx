import LeaderboardClient from "@/components/leaderboard-client";

export default function LeaderboardPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Realtime standings update automatically from live scoring and drink logs.
      </p>
      <div className="mt-6">
        <LeaderboardClient />
      </div>
    </main>
  );
}
