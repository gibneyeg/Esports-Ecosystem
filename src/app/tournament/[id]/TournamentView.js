"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout.jsx";
import TournamentBracket from "../../../components/TournamentBracket.jsx";
import TournamentManagement from "../../../components/TournamentManagment.jsx";
import DeclareWinnerButton from "../../../components/TournamentWinner.jsx";

export default function TournamentView({ tournamentId }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to update tournament status
  const updateTournamentStatus = async (tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);

    let newStatus = tournament.status;

    if (endDate < now) {
      newStatus = "COMPLETED";
    } else if (now >= startDate && now <= endDate) {
      newStatus = "IN_PROGRESS";
    } else {
      newStatus = "UPCOMING";
    }

    // Only update if status has changed
    if (newStatus !== tournament.status) {
      try {
        const response = await fetch(`/api/tournaments/${tournament.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          throw new Error('Failed to update tournament status');
        }

        return await response.json();
      } catch (error) {
        console.error('Error updating tournament status:', error);
        return tournament;
      }
    }

    return tournament;
  };

  useEffect(() => {
    let mounted = true;

    async function fetchTournament() {
      if (!tournamentId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/tournaments/${tournamentId}/details`,
          {
            credentials: "include",
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch tournament");
        }

        if (mounted) {
          // Update tournament status if needed
          const updatedTournament = await updateTournamentStatus(data);
          setTournament(updatedTournament);
        }
      } catch (err) {
        console.error("Error fetching tournament:", err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchTournament();

    return () => {
      mounted = false;
    };
  }, [tournamentId]);

  const handleJoinTournament = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `/api/tournaments/${tournamentId}/participate`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join tournament");
      }

      setTournament(data);
    } catch (err) {
      console.error("Error joining tournament:", err);
      setError(err.message);
    }
  };

  const getDisplayName = (user) => {
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "Anonymous User";
  };

  const getParticipantDisplayName = (participant) => {
    return getDisplayName(participant.user);
  };

  const getTournamentStatus = () => {
    return tournament.status;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "COMPLETED":
        return "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800";
      case "IN_PROGRESS":
        return "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800";
      case "UPCOMING":
        return "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800";
      default:
        return "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800";
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case "SINGLE_ELIMINATION":
        return "🏆";
      case "DOUBLE_ELIMINATION":
        return "🔄";
      case "ROUND_ROBIN":
        return "🔁";
      case "SWISS":
        return "🎯";
      default:
        return "🎮";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Tournament not found
          </div>
        </div>
      </Layout>
    );
  }

  const isCreator = session?.user?.id === tournament.createdBy?.id;
  const isParticipant = tournament.participants?.some(
    (p) => p.user.id === session?.user?.id
  );
  const canJoin =
    !isParticipant &&
    tournament.participants.length < tournament.maxPlayers &&
    tournament.status === "UPCOMING" &&
    new Date() < new Date(tournament.registrationCloseDate);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const currentStatus = getTournamentStatus();

  return (
    <Layout>
      <br></br><br></br>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {tournament.name}
              </h1>
              <p className="text-gray-600 mt-2">
                Created by:{" "}
                {tournament.createdBy
                  ? getDisplayName(tournament.createdBy)
                  : "Unknown"}
              </p>
            </div>
            {session?.user && canJoin && (
              <button
                onClick={handleJoinTournament}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Join Tournament
              </button>
            )}
          </div>

          {tournament.imageUrl && (
            <div className="mt-4 mb-6">
              <img
                src={tournament.imageUrl}
                alt={tournament.name}
                className="w-full h-64 object-cover rounded-lg shadow-md"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mt-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Tournament Details</h2>
              <div className="space-y-3">
                <p>
                  <span className="font-medium">Game:</span> {tournament.game}
                </p>
                <p>
                  <span className="font-medium">Format:</span>{" "}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {getFormatIcon(tournament.format)}{" "}
                    {tournament.format?.split('_').map(word => 
                      word.charAt(0) + word.slice(1).toLowerCase()
                    ).join(' ')}
                  </span>
                </p>
                {tournament.format === 'SWISS' && tournament.formatSettings?.numberOfRounds && (
                  <p>
                    <span className="font-medium">Number of Rounds:</span>{" "}
                    {tournament.formatSettings.numberOfRounds}
                  </p>
                )}
                {tournament.format === 'ROUND_ROBIN' && tournament.formatSettings?.groupSize && (
                  <p>
                    <span className="font-medium">Players per Group:</span>{" "}
                    {tournament.formatSettings.groupSize}
                  </p>
                )}
                <p>
                  <span className="font-medium">Seeding:</span>{" "}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    {tournament.seedingType?.split('_').map(word => 
                      word.charAt(0) + word.slice(1).toLowerCase()
                    ).join(' ')}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Registration Closes:</span>{" "}
                  {formatDate(tournament.registrationCloseDate)}
                </p>
                <p>
                  <span className="font-medium">Start Date:</span>{" "}
                  {formatDate(tournament.startDate)}
                </p>
                <p>
                  <span className="font-medium">End Date:</span>{" "}
                  {formatDate(tournament.endDate)}
                </p>
                <p>
                  <span className="font-medium">Prize Pool:</span> ${tournament.prizePool}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  <span className={getStatusStyle(currentStatus)}>
                    {currentStatus}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Players:</span>{" "}
                  {tournament.participants?.length || 0}/{tournament.maxPlayers}
                </p>
                {tournament.winner && (
                  <p>
                    <span className="font-medium">Winner:</span>{" "}
                    <span className="text-green-600 font-semibold">
                      {getDisplayName(tournament.winner)}
                    </span>
                  </p>
                )}
                {tournament.rules && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Tournament Rules:</p>
                    <div className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap">
                      {tournament.rules}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Participants</h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tournament.participants?.length > 0 ? (
                  tournament.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="bg-gray-50 p-2 rounded-md flex items-center justify-between"
                    >
                      <span>{getParticipantDisplayName(participant)}</span>
                      <span className="text-sm text-gray-500">
                        {formatDate(participant.joinedAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No participants yet</p>
                )}
              </div>
            </div>
          </div>

          {isCreator && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Tournament Management</h2>
              <div className="flex gap-3">
                <DeclareWinnerButton 
                  tournament={tournament} 
                  onWinnerDeclared={(updatedTournament) => {
                    setTournament(updatedTournament);
                  }}
                />
                <TournamentManagement tournamentId={tournament.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}