"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Layout from "/src/components/Layout.jsx";

export default function Tournaments() {
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const searchInputRef = useRef(null);

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
    
    const searchTerm = query.toLowerCase();
    const filtered = tournaments.filter(tournament => 
      tournament.name.toLowerCase().includes(searchTerm) ||
      tournament.game.toLowerCase().includes(searchTerm)
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

  const getTimeUntilClose = (tournament) => {
    const closeDate = new Date(tournament.registrationCloseDate);
    const now = new Date();
    const hoursLeft = Math.floor((closeDate - now) / (1000 * 60 * 60));
    
    if (hoursLeft < 24) {
      return `${hoursLeft}h left to register`;
    }
    const daysLeft = Math.floor(hoursLeft / 24);
    return `${daysLeft}d left to register`;
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

  const SearchBar = () => {
    const handleChange = (e) => {
      setSearchQuery(e.target.value);
      filterTournaments(e.target.value);
    };

    return (
      <div className="mb-12">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tournaments by name or game..."
              value={searchQuery}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoComplete="off"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderTournamentCard = (tournament) => {
    const isCompleted = tournament.status === "COMPLETED";
    const now = new Date();
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
        <SearchBar />
        
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