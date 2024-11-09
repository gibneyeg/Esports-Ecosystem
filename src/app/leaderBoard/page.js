"use client";

import React, { useState } from "react";
import Layout from "/src/components/Layout.jsx";

export default function LeaderBoard() {
  const [selectedGame, setSelectedGame] = useState("All");

  const players = [
    {
      username: "NightHawk",
      points: {
        CS2: 1450,
        Valorant: 1400,
      },
      totalWinnings: "458,000",
      games: ["CS2", "Valorant"],
      tournaments: 24,
      recentPlacement: "1st - Global Masters",
    },
    {
      username: "QuantumAce",
      points: {
        Valorant: 1620,
        CS2: 1100,
      },
      totalWinnings: "389,000",
      games: ["Valorant", "CS2"],
      tournaments: 28,
      recentPlacement: "2nd - Tactical Ops Finals",
    },
    {
      username: "PhantomKing",
      points: {
        "DOTA 2": 1580,
        "League of Legends": 1110,
      },
      totalWinnings: "352,000",
      games: ["DOTA 2", "League of Legends"],
      tournaments: 22,
      recentPlacement: "1st - Battle of Ancients",
    },
    {
      username: "StormRider",
      points: {
        "League of Legends": 1480,
        "DOTA 2": 1060,
      },
      totalWinnings: "298,000",
      games: ["League of Legends", "DOTA 2"],
      tournaments: 26,
      recentPlacement: "3rd - Champions Arena",
    },
    {
      username: "EliteSniper",
      points: {
        CS2: 1280,
        Valorant: 1200,
      },
      totalWinnings: "275,000",
      games: ["CS2", "Valorant"],
      tournaments: 20,
      recentPlacement: "2nd - Pro League S12",
    },
  ];

  const gameTypes = ["All", "CS2", "Valorant", "DOTA 2", "League of Legends"];

  const getFilteredAndRankedPlayers = () => {
    let filteredPlayers =
      selectedGame === "All"
        ? players.map((player) => ({
            ...player,
            totalPoints: Object.values(player.points).reduce(
              (a, b) => a + b,
              0
            ),
          }))
        : players
            .filter((player) => player.games.includes(selectedGame))
            .map((player) => ({
              ...player,
              totalPoints: player.points[selectedGame] || 0,
            }));

    // Sort players by points
    filteredPlayers.sort((a, b) => b.totalPoints - a.totalPoints);

    // Add ranks
    return filteredPlayers.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  };

  const rankedPlayers = getFilteredAndRankedPlayers();

  return (
    <Layout>
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Player Rankings</h1>
            <p className="text-gray-600">
              {selectedGame === "All"
                ? "Top performers ranked by total tournament points"
                : `Top performers ranked by ${selectedGame} points`}
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            {gameTypes.map((game) => (
              <button
                key={game}
                onClick={() => setSelectedGame(game)}
                className={`px-4 py-2 rounded-lg transition-colors duration-200 
                  ${
                    selectedGame === game
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {game}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      Player
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      Points
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      Games
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      Total Winnings
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      Tournaments
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      Recent Result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rankedPlayers.map((player) => (
                    <tr
                      key={player.username}
                      className={`
                        hover:bg-gray-50 transition-colors duration-200
                        ${player.rank === 1 ? "bg-yellow-50" : ""}
                        ${player.rank === 2 ? "bg-gray-50" : ""}
                        ${player.rank === 3 ? "bg-amber-50" : ""}
                      `}
                    >
                      <td className="px-6 py-4">
                        <div
                          className={`
                          flex items-center gap-2 font-bold text-xl
                          ${player.rank === 1 ? "text-yellow-600" : ""}
                          ${player.rank === 2 ? "text-gray-600" : ""}
                          ${player.rank === 3 ? "text-amber-700" : ""}
                          ${player.rank > 3 ? "text-gray-400" : ""}
                        `}
                        >
                          {player.rank === 1 && "👑"}
                          {player.rank === 2 && "🥈"}
                          {player.rank === 3 && "🥉"}#{player.rank}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-black">
                          {player.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {player.totalPoints.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {player.games.map((game, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-sm
                                ${
                                  game === selectedGame
                                    ? "bg-black text-white"
                                    : "bg-gray-100 text-gray-700"
                                }
                              `}
                            >
                              {game}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        ${player.totalWinnings}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {player.tournaments}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {player.recentPlacement}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
