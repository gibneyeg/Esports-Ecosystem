"use client";

import React, { useState, useEffect } from "react";
import Layout from "/src/components/Layout.jsx";

const RANKS = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];

const getRankStyle = (rank) => {
  const styles = {
    'Bronze': { bg: 'bg-amber-800', text: 'text-amber-800', border: 'border-amber-800' },
    'Silver': { bg: 'bg-gray-400', text: 'text-gray-400', border: 'border-gray-400' },
    'Gold': { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500' },
    'Platinum': { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500' },
    'Diamond': { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
    'Master': { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600' },
    'Grandmaster': { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600' }
  };
  return styles[rank] || styles['Bronze'];
};

export default function LeaderBoard() {
  const [selectedRank, setSelectedRank] = useState("All");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const response = await fetch('/api/leaderboard');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        }
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const getFilteredAndRankedPlayers = () => {
    const filteredUsers = selectedRank === 'All' 
      ? users 
      : users.filter(user => user.rank === selectedRank);

    return filteredUsers
      .sort((a, b) => b.points - a.points)
      .map((user, index) => ({
        ...user,
        leaderboardPosition: index + 1,
      }));
  };

  const rankedPlayers = getFilteredAndRankedPlayers();

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Player Rankings</h1>
            <p className="text-gray-600">
              {selectedRank === "All"
                ? "All players ranked by total points"
                : `${selectedRank} ranked players`}
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            {RANKS.map((rank) => {
              const rankStyle = getRankStyle(rank);
              return (
                <button
                  key={rank}
                  onClick={() => setSelectedRank(rank)}
                  className={`
                    px-4 py-2 rounded-lg transition-colors duration-200 
                    ${rank === 'All' 
                      ? selectedRank === 'All'
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : `border-2 ${rankStyle.border} ${selectedRank === rank ? rankStyle.bg + ' text-white' : 'bg-white ' + rankStyle.text}`
                    }
                  `}
                >
                  {rank === 'All' ? 'All Ranks' : rank}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">#</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Player</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Points</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Tournaments Won</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Total Winnings</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Recent Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rankedPlayers.map((player) => {
                    const rankStyle = getRankStyle(player.rank);
                    return (
                      <tr
                        key={player.id}
                        className={`
                          hover:bg-gray-50 transition-colors duration-200
                          ${player.leaderboardPosition === 1 ? "bg-yellow-50" : ""}
                          ${player.leaderboardPosition === 2 ? "bg-gray-50" : ""}
                          ${player.leaderboardPosition === 3 ? "bg-amber-50" : ""}
                        `}
                      >
                        <td className="px-6 py-4">
                          <div
                            className={`
                              flex items-center gap-2 font-bold text-xl
                              ${player.leaderboardPosition === 1 ? "text-yellow-600" : ""}
                              ${player.leaderboardPosition === 2 ? "text-gray-600" : ""}
                              ${player.leaderboardPosition === 3 ? "text-amber-700" : ""}
                              ${player.leaderboardPosition > 3 ? "text-gray-400" : ""}
                            `}
                          >
                            {player.leaderboardPosition === 1 && "👑"}
                            {player.leaderboardPosition === 2 && "🥈"}
                            {player.leaderboardPosition === 3 && "🥉"}
                            {player.leaderboardPosition}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-black">
                            {player.username || player.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span 
                              className={`px-3 py-1 rounded-full text-sm font-semibold border
                                ${rankStyle.text} ${rankStyle.border} bg-white
                                flex items-center gap-2
                              `}
                            >
                              <span className={`w-2 h-2 rounded-full ${rankStyle.bg}`}></span>
                              {player.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {player.points}
                        </td>
                        <td className="px-6 py-4">
                          {player.tournamentWins?.length || 0}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          ${player.totalWinnings?.toLocaleString() || "0"}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {player.recentResult || "No recent results"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}