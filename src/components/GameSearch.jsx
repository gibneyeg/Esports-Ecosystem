import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const GameSkeleton = () => {
  return (
    <div className="w-full animate-pulse">
      <div className="w-full aspect-[3/4] bg-gray-200 rounded-lg"></div>
      <div className="mt-2 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="flex flex-wrap gap-1">
          <div className="h-5 bg-gray-200 rounded-full w-16"></div>
          <div className="h-5 bg-gray-200 rounded-full w-12"></div>
        </div>
      </div>
    </div>
  );
};

const SearchSkeleton = () => {
  return (
    <div className="w-full animate-pulse">
      <div className="w-full h-12 bg-gray-200 rounded-lg"></div>
    </div>
  );
};

const GameList = ({ games, onGameSelect, selectedGame, loading }) => {
  if (loading) {
    return (
      <div className="w-full px-1">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="w-full">
              <GameSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {games.map((game) => (
          <div key={game.id} className="w-full">
            <button
              onClick={() => onGameSelect(game.name)}
              className={`w-full flex flex-col ${selectedGame === game.name ? 'scale-105 transition-transform duration-200' : ''
                }`}
            >
              <div className={`w-full aspect-[3/4] rounded-lg overflow-hidden border-2 transition-colors duration-200 ${selectedGame === game.name ? 'border-blue-500' : 'border-transparent'
                }`}>
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-2 space-y-1">
                <span className={`block text-sm truncate ${selectedGame === game.name ? 'text-blue-500 font-medium' : ''
                  }`}>
                  {game.name}
                </span>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SearchBar({ searchQuery, setSearchQuery, filterTournaments }) {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchRandomGames = async () => {
    try {
      setLoading(true);
      const randomOffset = Math.floor(Math.random() * 100);
      const response = await fetch(`/api/games?limit=5&offset=${randomOffset}`);
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      setGames(data.games);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomGames().then(() => {
      // Add a slight delay to ensure smooth animation
      setTimeout(() => {
        setInitialLoad(false);
      }, 300);
    });
  }, []);

  const handleGameSelect = (gameName) => {
    if (selectedGame === gameName) {
      setSelectedGame('');
      updateSearch('');
      return;
    }
    setSelectedGame(gameName);
    updateSearch(gameName);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Show brief loading state when typing
    setSearchLoading(true);
    setTimeout(() => {
      updateSearch(selectedGame, value);
      setSearchLoading(false);
    }, 300);
  };

  const updateSearch = (game = '', query = searchQuery) => {
    const searchTerms = [];

    if (query.trim()) searchTerms.push(query.toLowerCase());
    if (game) searchTerms.push(game.toLowerCase());

    filterTournaments(searchTerms.join(' '));
  };

  const clearAllFilters = () => {
    setSelectedGame('');
    setSearchQuery('');
    filterTournaments('');
  };

  if (initialLoad) {
    return (
      <div className="w-full max-w-[1200px] mx-auto mb-12 animate-fade-in">
        <div className="space-y-6">
          {/* Search input skeleton */}
          <div className="flex">
            <SearchSkeleton />
          </div>

          {/* Games section skeleton */}
          <div className="bg-white rounded-lg px-6 py-6">
            <div className="flex justify-between items-center mb-6">
              <div className="h-5 bg-gray-200 rounded w-36 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="w-full">
                  <GameSkeleton />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto mb-12 animate-fade-in">
      <div className="space-y-6">
        <div className="flex">
          <div className="relative w-full">
            {searchLoading ? (
              <SearchSkeleton />
            ) : (
              <>
                <input
                  type="text"
                  placeholder="SEARCH TOURNAMENTS"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full px-6 py-3 text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  autoComplete="off"
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active filters section */}
        {selectedGame && (
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 rounded-lg p-3">
            <span className="text-sm font-medium text-blue-700">Active filters:</span>

            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              Game: {selectedGame}
              <button
                onClick={() => handleGameSelect(selectedGame)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>

            <button
              onClick={clearAllFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Games section */}
        <div className="bg-white rounded-lg px-6 py-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-medium">Featured Games</h3>
              <button
                onClick={fetchRandomGames}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 disabled:text-blue-300 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                title="Show different games"
              >
                <svg
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
            <Link
              href="/games"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              See all
            </Link>
          </div>
          <GameList
            games={games}
            onGameSelect={handleGameSelect}
            selectedGame={selectedGame}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}