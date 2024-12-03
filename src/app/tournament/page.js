"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Layout from "/src/components/Layout.jsx";

export default function Tournaments() {
  const { data: session } = useSession();
  const [createdTournaments, setCreatedTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch("/api/tournaments");
        if (response.ok) {
          const data = await response.json();
          setCreatedTournaments(data);
        }
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const featuredTournaments = [
    {
      name: "Sparking Zero",
      date: "October 2024",
      image: "/img/sparkingZero.jpeg",
      description:
        "An epic showdown featuring top players from around the world.",
    },
    {
      name: "Tekken 8 Tournament",
      date: "November 2024",
      image: "/img/tekken-8__00646.jpg",
      description: "The most anticipated Tekken 8 tournament of the year.",
    },
    {
      name: "LoL World Championship",
      date: "November 2024",
      image: "/img/LoL.jpeg",
      description: "League of Legends championship with global participation.",
    },
    {
      name: "Street Fighter 6 Tournament",
      date: "December 2024",
      image: "/img/Street_Fighter_6_box_art.jpg",
      description: "A legendary tournament for Street Fighter fans.",
    },
  ];

  const registrationClosingSoon = [
    {
      name: "Street Fighter 6 Showdown",
      date: "December 2024",
      image: "/img/Street_Fighter_6_box_art.jpg",
      closingDate: "November 15, 2024",
    },
    {
      name: "FC25 Esports",
      date: "January 2025",
      image: "/img/FC25-Cover-1954e56.jpg",
      closingDate: "December 10, 2024",
    },
    {
      name: "FIFA 24 Tournament",
      date: "January 2025",
      image: "/img/sparkingZero.jpeg",
      closingDate: "November 25, 2024",
    },
  ];
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
        ) : createdTournaments.length > 0 ? (
          <div className="flex overflow-x-auto space-x-4 py-4">
            {createdTournaments.map((tournament) => (
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
                    <span className="text-4xl text-gray-400">
                      {tournament.game[0]}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {tournament.name}
                </h3>
                <p className="text-gray-500 text-sm mt-2">
                  Test{tournament.game}
                </p>
                <p className="text-gray-500">
                  Prize Pool: ${tournament.prizePool}
                </p>
                <p className="text-gray-500">
                  Players: {tournament.participants?.length || 0}/
                  {tournament.maxPlayers}
                </p>
                <Link
                  href={`/tournament/${tournament.id}`}
                  className="mt-4 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 text-xs inline-block"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No active tournaments available.</p>
        )}
      </section>

      <section className="mt-8 px-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Featured Tournaments
        </h2>
        <div className="flex overflow-x-auto space-x-4 py-4">
          {featuredTournaments.map((tournament, index) => (
            <div
              key={index}
              className="flex-none bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 w-64"
            >
              <img
                src={tournament.image}
                alt={tournament.name}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-800">
                {tournament.name}
              </h3>
              <p className="text-gray-500 text-sm mt-2">{tournament.date}</p>
              <p className="text-gray-600 mt-2 text-sm">
                {tournament.description}
              </p>
              <button className="mt-4 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 text-xs">
                Learn More
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 px-4 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Registration Closing Soon
        </h2>
        <div className="flex overflow-x-auto space-x-4 py-4">
          {registrationClosingSoon.map((tournament, index) => (
            <div
              key={index}
              className="flex-none bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 w-64"
            >
              <img
                src={tournament.image}
                alt={tournament.name}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-800">
                {tournament.name}
              </h3>
              <p className="text-gray-500 text-sm mt-2">{tournament.date}</p>
              <p className="text-red-500 font-semibold mt-2 text-sm">
                Registration ends: {tournament.closingDate}
              </p>
              <button className="mt-4 px-4 py-2 text-white bg-orange-600 rounded-md hover:bg-orange-700 text-xs">
                Register Now
              </button>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
