"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout.jsx";

export default function TournamentView({ tournamentId }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setTournament(data);
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
    tournament.status === "UPCOMING";

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {tournament.name}
              </h1>
              <p className="text-gray-600 mt-2">
                Created by: {tournament.createdBy?.name || "Unknown"}
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

          <div className="grid grid-cols-2 gap-6 mt-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Tournament Details</h2>
              <div className="space-y-3">
                <p>
                  <span className="font-medium">Game:</span> {tournament.game}
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
                  <span className="font-medium">Prize Pool:</span> $
                  {tournament.prizePool}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  {tournament.status}
                </p>
                <p>
                  <span className="font-medium">Players:</span>{" "}
                  {tournament.participants?.length || 0}/{tournament.maxPlayers}
                </p>
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
                      <span>{participant.user.name}</span>
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

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {tournament.description}
            </p>
          </div>

          {isCreator && (
            <div className="mt-8 pt-8 border-t">
              <h2 className="text-xl font-semibold mb-4">
                Tournament Management
              </h2>
              <div className="flex gap-4">
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700">
                  Edit Tournament
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                  Cancel Tournament
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
