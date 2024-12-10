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

  // Helper function to format dates
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Filter tournaments based on different criteria
  const activeTournaments = tournaments.filter(
    (t) => t.status === "UPCOMING" || t.status === "IN_PROGRESS"
  );

  const featuredTournaments = tournaments
    .filter((t) => t.prizePool >= 1000 && t.status === "UPCOMING")
    .slice(0, 4);

  // Get tournaments with close registration dates (within next 7 days)
  const closingSoonTournaments = tournaments.filter((tournament) => {
    if (tournament.status !== "UPCOMING") return false;
    const startDate = new Date(tournament.startDate);
    const now = new Date();
    const daysUntilStart = (startDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilStart <= 7 && daysUntilStart > 0;
  });

  const renderTournamentCard = (tournament, buttonStyle = "blue") => (
    <div
      key={tournament.id}
      className="flex-none bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 w-64"
    >
      <div className="w-full h-40 bg-gray-100 rounded-md mb-4 flex items-center justify-center">
        {tournament.imageUrl ? (
          <img
            src={tournament.imageUrl}
            alt={tournament.name}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          <span className="text-4xl text-gray-400">{tournament.game[0]}</span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-800">{tournament.name}</h3>
      <p className="text-gray-500 text-sm mt-2">{tournament.game}</p>
      <p className="text-gray-500">Prize Pool: ${tournament.prizePool}</p>
      <p className="text-gray-500">
        Players: {tournament.participants?.length || 0}/{tournament.maxPlayers}
      </p>
      {buttonStyle === "orange" && (
        <p className="text-red-500 font-semibold mt-2 text-sm">
          Starts: {formatDate(tournament.startDate)}
        </p>
      )}
      <Link
        href={`/tournament/${tournament.id}`}
        className={`mt-4 px-4 py-2 text-white ${
          buttonStyle === "orange"
            ? "bg-orange-600 hover:bg-orange-700"
            : "bg-blue-600 hover:bg-blue-700"
        } rounded-md text-xs inline-block`}
      >
        {buttonStyle === "orange" ? "Register Now" : "View Details"}
      </Link>
    </div>
  );

  return (
    <Layout>
      <div className="text-center mt-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Upcoming Esports Tournaments
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Check out the featured tournaments and those with registration closing
          soon.
        </p>
        <Link
          href="/tournament/create"
          className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Create New Tournament
        </Link>
      </div>

      <section className="mt-8 px-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Active Tournaments
        </h2>
        {isLoading ? (
          <div className="flex overflow-x-auto space-x-4 py-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className="flex-none bg-white p-4 rounded-lg shadow-lg w-64 animate-pulse"
              >
                <div className="w-full h-40 bg-gray-200 rounded-md mb-4" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-16 bg-gray-200 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="mt-4 h-8 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        ) : activeTournaments.length > 0 ? (
          <div className="flex overflow-x-auto space-x-4 py-4">
            {activeTournaments.map((tournament) =>
              renderTournamentCard(tournament)
            )}
          </div>
        ) : (
          <p className="text-gray-600">No active tournaments available.</p>
        )}
      </section>

      {featuredTournaments.length > 0 && (
        <section className="mt-8 px-4">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Featured Tournaments
          </h2>
          <div className="flex overflow-x-auto space-x-4 py-4">
            {featuredTournaments.map((tournament) =>
              renderTournamentCard(tournament)
            )}
          </div>
        </section>
      )}

      {closingSoonTournaments.length > 0 && (
        <section className="mt-8 px-4 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Registration Closing Soon
          </h2>
          <div className="flex overflow-x-auto space-x-4 py-4">
            {closingSoonTournaments.map((tournament) =>
              renderTournamentCard(tournament, "orange")
            )}
          </div>
        </section>
      )}
    </Layout>
  );
}
