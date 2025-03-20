"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "/src/components/Layout.jsx";
import SearchBar from "../../components/GameSearch";

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch("/api/tournaments");
        if (response.ok) {
          const data = await response.json();
          setTournaments(data);
          setFilteredTournaments(data);
        }
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const filterTournaments = (query) => {
    if (!query.trim()) {
      setFilteredTournaments(tournaments);
      return;
    }

    const searchTerms = query.toLowerCase().split(' ');
    const filtered = tournaments.filter(tournament =>
      searchTerms.every(term =>
        tournament.name.toLowerCase().includes(term) ||
        tournament.game.toLowerCase().includes(term)
      )
    );

    setFilteredTournaments(filtered);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const now = new Date();

  const registrationClosingSoon = filteredTournaments.filter((tournament) => {
    const registrationCloseDate = new Date(tournament.registrationCloseDate);
    const daysUntilClose =
      (registrationCloseDate - now) / (1000 * 60 * 60 * 24);
    return (
      daysUntilClose <= 7 &&
      daysUntilClose > 0 &&
      tournament.status === "UPCOMING"
    );
  });

  const activeTournaments = filteredTournaments.filter((tournament) => {
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);
    return (startDate <= now && endDate >= now) || tournament.status === "IN_PROGRESS";
  });

  const upcomingTournaments = filteredTournaments.filter((tournament) => {
    const startDate = new Date(tournament.startDate);
    return startDate > now && tournament.status === "UPCOMING";
  });

  const completedTournaments = filteredTournaments.filter((tournament) => {
    const endDate = new Date(tournament.endDate);
    return endDate < now || tournament.status === "COMPLETED";
  });

  const renderTournamentCard = (tournament) => {
    const isCompleted = tournament.status === "COMPLETED";
    const registrationCloseDate = new Date(tournament.registrationCloseDate);
    const daysUntilClose = Math.ceil((registrationCloseDate - now) / (1000 * 60 * 60 * 24));
    const showReminder = daysUntilClose <= 7 && daysUntilClose > 0 && tournament.status === "UPCOMING";

    return (
      <div
        key={tournament.id}
        className="flex-none bg-white p-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 w-72 relative group"
      >
        {showReminder && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium z-30">
            {daysUntilClose}d left to register
          </div>
        )}

        <div className="relative w-full h-40 mb-4">
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

          <div className="relative w-full h-full rounded-lg overflow-hidden">
            {tournament.imageUrl ? (
              <img
                src={tournament.imageUrl}
                alt={tournament.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <span className="text-4xl font-bold text-gray-300">
                  {tournament.game[0]}
                </span>
              </div>
            )}
          </div>
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
                {/* Registration close date in original gray */}
                <div className="text-xs text-gray-600">Registration Closes</div>
                <div className="font-medium text-sm text-gray-800">
                  {formatDate(tournament.registrationCloseDate)}
                </div>
                {/* Tournament start date in blue */}
                <div className="text-xs text-red-600 mt-2">Tournament Starts</div>
                <div className="font-medium text-sm text-red-700">
                  {formatDate(tournament.startDate)}
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
            className={`mt-3 w-full py-2 px-4 text-white text-sm text-center font-medium rounded-lg transition-colors ${isCompleted
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
      <div className="relative bg-[#0f111a] text-white py-32">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white">
            Esports Tournaments
          </h1>
          <p className="text-xl text-gray-300">
            Browse and join tournaments or create your own
          </p>
          <Link
            href="/tournament/create"
            className="inline-block px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Create New Tournament
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-[1240px] mx-auto">
          <div className="mb-16">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterTournaments={filterTournaments}
            />
          </div>

          <div className="pl-8">
            <section className="mb-16">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="text-orange-500 mr-2">●</span>
                  Registration Closing Soon
                </h2>
                <Link
                  href={`/tournament/category/closing-soon`}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  See All ({registrationClosingSoon.length})
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              {registrationClosingSoon.length > 0 ? (
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {registrationClosingSoon.slice(0, 4).map((tournament) => renderTournamentCard(tournament))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  No tournaments with registration closing soon.
                </p>
              )}
            </section>

            <section className="mb-16">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="text-green-500 mr-2">●</span>
                  Active Tournaments
                </h2>
                <Link
                  href={`/tournament/category/active`}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  See All ({activeTournaments.length})
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              {activeTournaments.length > 0 ? (
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {activeTournaments.slice(0, 4).map((tournament) => renderTournamentCard(tournament))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  No active tournaments at the moment.
                </p>
              )}
            </section>

            <section className="mb-16">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="text-blue-500 mr-2">●</span>
                  Upcoming Tournaments
                </h2>
                <Link
                  href={`/tournament/category/upcoming`}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  See All ({upcomingTournaments.length})
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              {isLoading ? (
                <div className="flex gap-6 overflow-x-auto pb-4">
                  {[1, 2, 3, 4].map((index) => (
                    <div
                      key={index}
                      className="flex-none bg-white p-6 rounded-xl shadow-lg w-72 animate-pulse"
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
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {upcomingTournaments.slice(0, 4).map((tournament) => renderTournamentCard(tournament))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  No upcoming tournaments available.
                </p>
              )}
            </section>

            <section className="mb-16">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="text-red-600 mr-2">●</span>
                  Completed Tournaments
                </h2>
                <Link
                  href={`/tournament/category/completed`}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  See All ({completedTournaments.length})
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              {completedTournaments.length > 0 ? (
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {completedTournaments.slice(0, 4).map((tournament) => renderTournamentCard(tournament))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  No completed tournaments available.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}