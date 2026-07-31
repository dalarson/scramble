import StatsClient from "@/components/stats-client";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  return <StatsClient initialTournamentId={params.tournament} />;
}

