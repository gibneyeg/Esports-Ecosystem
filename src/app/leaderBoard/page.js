"use client";
import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import Layout from "/src/components/Layout.jsx";
import Link from "next/link";

const RANKS = [
  { id: 'All', label: 'All Ranks' },
  { id: 'Bronze', label: 'Bronze' },
  { id: 'Silver', label: 'Silver' },
  { id: 'Gold', label: 'Gold' },
  { id: 'Platinum', label: 'Platinum' },
  { id: 'Diamond', label: 'Diamond' },
  { id: 'Master', label: 'Master' },
  { id: 'Grandmaster', label: 'Grandmaster' }
];

const fetcher = async (url) => {
  const res = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
};

const getRankStyle = (rank) => {
  const styles = {
    'Bronze': {
      bg: 'bg-gradient-to-r from-amber-800 to-amber-700',
      text: 'text-amber-800',
      border: 'border-amber-800',
      lightBg: 'bg-amber-50'
    },
    'Silver': {
      bg: 'bg-gradient-to-r from-gray-400 to-gray-300',
      text: 'text-gray-500',
      border: 'border-gray-400',
      lightBg: 'bg-gray-50'
    },
    'Gold': {
      bg: 'bg-gradient-to-r from-yellow-500 to-yellow-400',
      text: 'text-yellow-600',
      border: 'border-yellow-500',
      lightBg: 'bg-yellow-50'
    },
    'Platinum': {
      bg: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
      text: 'text-cyan-600',
      border: 'border-cyan-500',
      lightBg: 'bg-cyan-50'
    },
    'Diamond': {
      bg: 'bg-gradient-to-r from-blue-500 to-blue-400',
      text: 'text-blue-600',
      border: 'border-blue-500',
      lightBg: 'bg-blue-50'
    },
    'Master': {
      bg: 'bg-gradient-to-r from-purple-600 to-purple-500',
      text: 'text-purple-600',
      border: 'border-purple-600',
      lightBg: 'bg-purple-50'
    },
    'Grandmaster': {
      bg: 'bg-gradient-to-r from-red-600 to-red-500',
      text: 'text-red-600',
      border: 'border-red-600',
      lightBg: 'bg-red-50'
    }
  };
  return styles[rank] || styles['Bronze'];
};

const PositionBadge = ({ position }) => {
  if (position === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-300 text-yellow-900 shadow-md">
        🏆
      </div>
    );
  } else if (position === 2) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-gray-300 to-gray-200 text-gray-700 shadow-md">
        🥈
      </div>
    );
  } else if (position === 3) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-amber-700 to-amber-600 text-amber-100 shadow-md">
        🥉
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold">
      {position}
    </div>
  );
};

const LeaderboardRankBadge = ({ rank }) => {
  const rankStyle = getRankStyle(rank);
  const rankIcon = () => {
    switch (rank) {
      case 'Grandmaster': return '🏆';
      case 'Master': return '🎖️';
      case 'Diamond': return '💠';
      case 'Platinum': return '💎';
      case 'Gold': return '🥇';
      case 'Silver': return '🥈';
      case 'Bronze': return '🥉';
      default: return '🎮';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${rankStyle.bg} text-white text-sm font-semibold shadow-sm`}>
      <span>{rankIcon()}</span>
      {rank}
    </div>
  );
};

export default function LeaderBoard() {
  const [selectedRank, setSelectedRank] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage] = useState(10);

  const { data, error } = useSWR('/api/leaderboard', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const isLoading = !data && !error;
  const users = data?.users || [];

  // Reset pagination when rank filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRank]);

  // Filter and rank players
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

  const allRankedPlayers = getFilteredAndRankedPlayers();

  // Paginate players
  const indexOfLastPlayer = currentPage * playersPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
  const currentPlayers = allRankedPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
  const totalPages = Math.ceil(allRankedPlayers.length / playersPerPage);

  // Find the highest points for the progress bar (from all players, not just current page)
  const maxPoints = allRankedPlayers.length > 0
    ? allRankedPlayers[0].points // This ensures the top player has a 100% width bar
    : 5500; // Fallback if no users

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="animate-pulse space-y-8">
              <div className="h-12 bg-gray-200 rounded w-1/3 mx-auto"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>

              <div className="flex flex-wrap gap-3 justify-center">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded-lg w-24"></div>
                ))}
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Pagination controls
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of table when changing pages
      window.scrollTo({ top: document.getElementById('leaderboard-table').offsetTop - 100, behavior: 'smooth' });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 text-gray-900">Player Rankings</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {selectedRank === "All"
                ? "All players ranked by total points earned in tournaments"
                : `${selectedRank} ranked players and their achievements`}
            </p>
          </div>

          {/* Rank filter buttons */}
          <div className="mb-8 flex flex-wrap gap-3 justify-center">
            {RANKS.map((rank) => {
              const rankStyle = rank.id !== 'All' ? getRankStyle(rank.id) : null;
              // Simple emoji for rank indicators
              const getRankEmoji = (rankId) => {
                switch (rankId) {
                  case 'All': return '👥';
                  case 'Bronze': return '🥉';
                  case 'Silver': return '🥈';
                  case 'Gold': return '🥇';
                  case 'Platinum': return '💎';
                  case 'Diamond': return '💠';
                  case 'Master': return '🎖️';
                  case 'Grandmaster': return '🏆';
                  default: return '🎮';
                }
              };

              return (
                <button
                  key={rank.id}
                  onClick={() => setSelectedRank(rank.id)}
                  className={`
                    px-4 py-2.5 rounded-lg transition-all duration-200 
                    flex items-center gap-2 shadow-sm hover:shadow
                    ${rank.id === 'All'
                      ? selectedRank === 'All'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      : `border ${rankStyle?.border} ${selectedRank === rank.id
                        ? rankStyle?.bg + ' text-white'
                        : 'bg-white ' + rankStyle?.text + ' hover:bg-gray-50'}`
                    }
                  `}
                >
                  <span>{getRankEmoji(rank.id)}</span>
                  <span>{rank.label}</span>
                </button>
              );
            })}
          </div>

          {/* Results summary */}
          <div className="mb-4 text-center">
            <p className="text-gray-600">
              Showing {indexOfFirstPlayer + 1}-{Math.min(indexOfLastPlayer, allRankedPlayers.length)} of {allRankedPlayers.length} players
            </p>
          </div>

          {/* Leaderboard table */}
          <div id="leaderboard-table" className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Player</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Division</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      <div className="flex items-center gap-1">
                        <span>📈</span>
                        <span>Points</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      <div className="flex items-center gap-1">
                        <span>🏆</span>
                        <span>Tournaments</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      <div className="flex items-center gap-1">
                        <span>💰</span>
                        <span>Winnings</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                      <div className="flex items-center gap-1">
                        <span>🕒</span>
                        <span>Recent</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentPlayers.map((player) => {
                    const rankStyle = getRankStyle(player.rank);
                    const isTopThree = player.leaderboardPosition <= 3;

                    return (
                      <tr
                        key={player.id}
                        className={`
                          transition-colors duration-200 group
                          ${isTopThree ? rankStyle.lightBg : 'hover:bg-gray-50'}
                        `}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center">
                            <PositionBadge position={player.leaderboardPosition} />
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                            <Link href={`/user/${player.id}`} className="hover:underline">
                              {player.username || player.name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <LeaderboardRankBadge rank={player.rank} />
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-gray-900">
                            {player.points.toLocaleString()}

                            {/* Progress bar - now the top player will have 100% width */}
                            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                              <div
                                className={`h-full ${rankStyle.bg}`}
                                style={{ width: `${(player.points / maxPoints) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-medium text-gray-900">
                            {player.tournamentWins?.length || 0}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-green-600">
                            ${player.totalWinnings?.toLocaleString() || "0"}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm text-gray-700 max-w-xs truncate">
                            {player.recentResult ? (
                              <Link
                                href={`/tournament/${player.recentTournamentId}`}
                                className="hover:text-blue-600 hover:underline"
                              >
                                {player.recentResult}
                              </Link>
                            ) : (
                              "No recent results"
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty state if no players match the filter */}
                  {currentPlayers.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-lg font-medium mb-1">No players found</p>
                          <p>Try selecting a different rank category</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded text-sm ${currentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded text-sm ${currentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  <div className="flex space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      // Show pages around current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-8 h-8 flex items-center justify-center rounded ${currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded text-sm ${currentPage === totalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded text-sm ${currentPage === totalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}