import LeaderboardClient from "@/components/leaderboard-client";

export default async function TournamentLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{ teamId?: string; access?: string }>;
}) {
  const { tournamentId } = await params;
  const { teamId, access } = await searchParams;
  const liveHref = teamId
    ? `/tournament/${tournamentId}/team/${teamId}${access ? `?access=${encodeURIComponent(access)}` : ""}`
    : undefined;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-4">
      <div>
        <LeaderboardClient
          hideTournamentSelector
          highlightTeamId={teamId}
          initialTournamentId={tournamentId}
          liveHref={liveHref}
        />
      </div>
    </main>
  );
}
