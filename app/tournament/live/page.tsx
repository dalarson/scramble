import LiveTournamentClient from "@/components/live-tournament-client";

export default function LiveTournamentPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Live Tournament Admin</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Use this admin view for setup and verification. Team QR links should point
        to the team-scoped live route.
      </p>
      <div className="mt-6">
        <LiveTournamentClient />
      </div>
    </main>
  );
}
