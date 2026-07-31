import LiveTournamentClient from "@/components/live-tournament-client";

export default async function TeamLivePage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string; teamId: string }>;
  searchParams: Promise<{ access?: string }>;
}) {
  const { tournamentId, teamId } = await params;
  const { access } = await searchParams;
  const leaderboardHref = `/tournament/${tournamentId}/leaderboard?teamId=${teamId}${
    access ? `&access=${encodeURIComponent(access)}` : ""
  }`;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-5">
      <LiveTournamentClient
        accessToken={access}
        hideTournamentSelector
        initialTeamId={teamId}
        initialTournamentId={tournamentId}
        leaderboardHref={leaderboardHref}
        lockTeam
      />
    </main>
  );
}
