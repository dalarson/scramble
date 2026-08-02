import TournamentReviewClient from "@/components/tournament-review-client";

export default async function TournamentReviewPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  return <TournamentReviewClient tournamentId={tournamentId} />;
}
