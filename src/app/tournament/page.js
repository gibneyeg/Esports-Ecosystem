"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Layout from "/src/components/Layout.jsx";

export default function Tournaments() {
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch("/api/tournaments");
        if (response.ok) {
          const data = await response.json();
          setTournaments(data);
        }
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter tournaments based on different criteria
  const now = new Date();

  const registrationClosingSoon = tournaments.filter((tournament) => {
    const registrationCloseDate = new Date(tournament.registrationCloseDate);
    const daysUntilClose =
      (registrationCloseDate - now) / (1000 * 60 * 60 * 24);
    return (
      daysUntilClose <= 7 &&
      daysUntilClose > 0 &&
      tournament.status === "UPCOMING"
    );
  });

  const activeTournaments = tournaments.filter((tournament) => {
    return tournament.status === "IN_PROGRESS";
  });

  const upcomingTournaments = tournaments.filter((tournament) => {
    const registrationCloseDate = new Date(tournament.registrationCloseDate);
    return tournament.status === "UPCOMING" && registrationCloseDate > now;
  });

  const completedTournaments = tournaments.filter((tournament) => {
    const endDate = new Date(tournament.endDate);
    return endDate < now || tournament.status === "COMPLETED";
  });

  const renderTournamentCard = (tournament) => {
    const isCompleted = tournament.status === "COMPLETED";

    return (
      <div
        key={tournament.id}
        className="flex-none bg-white p-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 w-72 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="w-full h-40 bg-gray-100 rounded-lg mb-4 overflow-hidden">
          {tournament.imageUrl ? (
            <img
              src={tournament.imageUrl}
              alt={tournament.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-4xl font-bold text-gray-300">
                {tournament.game[0]}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
            {tournament.name}
          </h3>

          <div className="flex items-center space-x-2 text-gray-600">
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
              {tournament.game}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Prize Pool</span>
              <span className="font-semibold text-green-600">
                ${tournament.prizePool}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Players</span>
              <span className="font-semibold">
                {tournament.participants?.length || 0}/{tournament.maxPlayers}
              </span>
            </div>

            {!isCompleted ? (
              <div className="pt-1">
                <div className="text-xs text-gray-600">Registration Closes</div>
                <div className="font-medium text-sm text-gray-800">
                  {formatDate(tournament.registrationCloseDate)}
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <div className="text-xs text-gray-600">Tournament Ended</div>
                <div className="font-medium text-sm text-gray-800">
                  {formatDate(tournament.endDate)}
                </div>
              </div>
            )}

            {isCompleted && tournament.winner && (
              <div className="pt-1">
                <div className="text-xs text-gray-600">Winner</div>
                <div className="font-medium text-sm text-gray-800">
                  {tournament.winner.name}
                </div>
              </div>
            )}
          </div>

          <Link
            href={`/tournament/${tournament.id}`}
            className={`mt-3 w-full py-2 px-4 text-white text-sm text-center font-medium rounded-lg transition-colors ${
              isCompleted
                ? "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700"
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            } block relative z-10`}
          >
            {isCompleted ? "View Results" : "View Details"}
          </Link>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="relative bg-[#0f111a] text-white py-32 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
            Esports Tournaments
          </h1>
          <p className="text-xl text-gray-300 mb-12">
            Browse and join tournaments or create your own
          </p>
          <Link
            href="/tournament/create"
            className="inline-block px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors duration-200 transform hover:scale-105"
          >
            Create New Tournament
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {registrationClosingSoon.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="text-orange-500 mr-2">●</span>
              Registration Closing Soon
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registrationClosingSoon.map((tournament) =>
                renderTournamentCard(tournament)
              )}
            </div>
          </section>
        )}

        {activeTournaments.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="text-green-500 mr-2">●</span>
              Active Tournaments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTournaments.map((tournament) =>
                renderTournamentCard(tournament)
              )}
            </div>
          </section>
        )}

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="text-blue-500 mr-2">●</span>
            Upcoming Tournaments
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-lg w-full animate-pulse"
                >
                  <div className="w-full h-40 bg-gray-200 rounded-lg mb-4" />
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingTournaments.map((tournament) =>
                renderTournamentCard(tournament)
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">
              No upcoming tournaments available.
            </p>
          )}
        </section>

        {completedTournaments.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="text-red-600 mr-2">●</span>
              Completed Tournaments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTournaments.map((tournament) =>
                renderTournamentCard(tournament)
              )}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
