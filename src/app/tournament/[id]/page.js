import TournamentView from "./TournamentView";

export default async function TournamentPage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const tournamentId = resolvedParams.id;

  return <TournamentView tournamentId={tournamentId} />;
}
