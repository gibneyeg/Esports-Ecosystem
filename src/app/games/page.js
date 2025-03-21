'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '/src/components/Layout';
import Link from 'next/link';

const LoadingSpinner = () => (
  <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />
);

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [tournaments, setTournaments] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const GAMES_PER_PAGE = 30;

  const fetchGames = async (query, newOffset, append = false) => {
    try {
      const response = await fetch(
        `/api/games?search=${encodeURIComponent(query)}&offset=${newOffset}&limit=${GAMES_PER_PAGE}`
      );

      if (!response.ok) throw new Error('Failed to fetch games');

      const data = await response.json();

      setGames(prev => append ? [...prev, ...data.games] : data.games);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setOffset(newOffset);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const handleSearch = useCallback((query) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setOffset(0);
        await fetchGames(query, 0, false);
      } finally {
        setLoading(false);
      }
    }, 300);

    setSearchTimeout(timeoutId);
  }, []);

  useEffect(() => {
    handleSearch(searchQuery);
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const fetchTournamentsForGame = async (gameName) => {
    try {
      const response = await fetch(`/api/tournaments?game=${encodeURIComponent(gameName)}`);
      if (!response.ok) throw new Error('Failed to fetch tournaments');
      const data = await response.json();
      setTournaments(prev => ({
        ...prev,
        [gameName]: data
      }));
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const handleGameClick = async (game) => {
    if (selectedGame?.id === game.id) {
      setSelectedGame(null);
      return;
    }
    setSelectedGame(game);
    if (!tournaments[game.name]) {
      await fetchTournamentsForGame(game.name);
    }
  };

  const handleShowMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const newOffset = offset + GAMES_PER_PAGE;
      await fetchGames(searchQuery, newOffset, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatStatus = (status) => {
    return status.split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Games</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-3 text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              {loading ? (
                <LoadingSpinner />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
          {total > 0 && (
            <div className="mt-2 text-sm text-gray-500">
              Showing {games.length} of {total} games
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {games.map((game) => (
                <div key={game.id} className="relative">
                  <button
                    onClick={() => handleGameClick(game)}
                    className={`w-full text-left ${selectedGame?.id === game.id ? 'transform scale-105' : ''
                      }`}
                  >
                    <div className={`aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedGame?.id === game.id ? 'border-blue-500' : 'border-transparent'
                      }`}>
                      <img
                        src={game.image}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-2 space-y-1">
                      <h3 className={`font-medium ${selectedGame?.id === game.id ? 'text-blue-500' : ''
                        }`}>
                        {game.name}
                      </h3>
                      {game.genres?.length > 0 && (
                        <p className="text-sm text-gray-500">
                          {game.genres.slice(0, 2).join(', ')}
                        </p>
                      )}
                      {game.releaseDate && (
                        <p className="text-sm text-gray-500">
                          {game.releaseDate}
                        </p>
                      )}
                      {game.rating && (
                        <p className="text-sm text-gray-500">
                          Rating: {game.rating}% ({game.ratingCount} reviews)
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Tournament Info Overlay */}
                  {selectedGame?.id === game.id && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h2 className="text-2xl font-bold">{game.name}</h2>
                            {game.genres?.length > 0 && (
                              <p className="text-gray-500 mt-1">
                                {game.genres.join(', ')}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedGame(null)}
                            className="text-gray-500 hover:text-gray-700 p-2"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {tournaments[game.name] ? (
                          tournaments[game.name].length > 0 ? (
                            <div className="space-y-4">
                              <h3 className="text-lg font-medium">Available Tournaments</h3>
                              {tournaments[game.name].map((tournament) => (
                                <div
                                  key={tournament.id}
                                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                                  onClick={() => window.location.href = `/tournament/${tournament.id}`}
                                >
                                  <div className="font-medium text-lg">{tournament.name}</div>
                                  <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                      <div className="text-sm text-gray-500">Players</div>
                                      <div className="font-medium">
                                        {tournament.participants?.length || 0}/{tournament.maxPlayers}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-500">Status</div>
                                      <div className="font-medium">
                                        {formatStatus(tournament.status)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-500">Start Date</div>
                                      <div className="font-medium">
                                        {formatDate(tournament.startDate)}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-500">Prize Pool</div>
                                      <div className="font-medium">
                                        ${tournament.prizePool}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-gray-500 mb-4">No tournaments available for this game.</p>
                              <Link
                                href="/tournament/create"
                                className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                              >
                                Create Tournament
                              </Link>
                            </div>
                          )
                        ) : (
                          <div className="flex justify-center py-4">
                            <LoadingSpinner />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* No Results */}
            {games.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No games found matching your search.</p>
              </div>
            )}

            {/* Show More Button */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleShowMore}
                  disabled={loadingMore}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner />
                      <span>Loading more games...</span>
                    </div>
                  ) : (
                    'Show More Games'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}