import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const GameSkeleton = () => {
  return (
    <div className="w-full animate-pulse">
      <div className="w-full aspect-[3/4] bg-gray-200 rounded-lg"></div>
      <div className="mt-2 space-y-2 px-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
        <div className="flex justify-center gap-1">
          <div className="h-4 bg-gray-200 rounded-full w-12"></div>
          <div className="h-4 bg-gray-200 rounded-full w-8"></div>
        </div>
      </div>
    </div>
  );
};

const SearchSkeleton = () => {
  return (
    <div className="w-full animate-pulse">
      <div className="w-full h-12 sm:h-14 bg-gray-200 rounded-lg"></div>
    </div>
  );
};

const GameList = ({ games, onGameSelect, selectedGame, loading }) => {
  if (loading) {
    return (
      <div className="w-full px-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {games.map((game) => (
          <div key={game.id} className="w-full">
            <button
              onClick={() => onGameSelect(game.name)}
              className={`w-full flex flex-col group touch-manipulation focus:outline-none ${selectedGame === game.name ? 'transform scale-105' : ''
                } transition-all duration-200 hover:scale-105 active:scale-95`}
            >
              <div className={`w-full aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedGame === game.name
                  ? 'border-blue-500 shadow-lg shadow-blue-500/25'
                  : 'border-gray-200 group-hover:border-gray-300 group-focus:border-blue-400'
                }`}>
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className="mt-2 px-1">
                <span className={`block text-sm font-medium text-center leading-tight transition-colors duration-200 ${selectedGame === game.name
                    ? 'text-blue-600'
                    : 'text-gray-900 group-hover:text-gray-700'
                  } line-clamp-2`}>
                  {game.name}
                </span>
                {game.genres && game.genres.length > 0 && (
                  <div className="flex justify-center gap-1 mt-1 flex-wrap">
                    {game.genres.slice(0, 2).map((genre, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
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

  // Create a ref to store the timeout
  const searchTimeoutRef = useRef(null);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
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

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set loading state
    setSearchLoading(true);

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      updateSearch(selectedGame, value);
      setSearchLoading(false);
    }, 800);
  };

  const updateSearch = (game = '', query = searchQuery) => {
    const searchTerms = [];

    if (query.trim()) searchTerms.push(query.toLowerCase());
    if (game) searchTerms.push(game.toLowerCase());

    filterTournaments(searchTerms.join(' '));
  };

  const clearAllFilters = () => {
    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setSelectedGame('');
    setSearchQuery('');
    filterTournaments('');
    setSearchLoading(false);
  };

  if (initialLoad) {
    return (
      <div className="w-full max-w-6xl mx-auto mb-8 sm:mb-12 animate-fade-in px-4">
        <div className="space-y-4 sm:space-y-6">
          {/* Search input skeleton */}
          <div className="flex">
            <SearchSkeleton />
          </div>

          {/* Games section skeleton */}
          <div className="bg-white rounded-lg px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="h-5 bg-gray-200 rounded w-32 sm:w-36 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-12 sm:w-16 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
    <div className="w-full max-w-6xl mx-auto mb-8 sm:mb-12 animate-fade-in px-4">
      <div className="space-y-4 sm:space-y-6">
        {/* Search Input */}
        <div className="flex">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="SEARCH TOURNAMENTS"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg rounded-lg border-2 border-gray-300 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                         placeholder:text-gray-400 transition-all duration-200 touch-manipulation
                         bg-white shadow-sm hover:shadow-md focus:shadow-lg"
              autoComplete="off"
            />
            <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              {searchLoading ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Active filters section */}
        {(selectedGame || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 rounded-lg p-3 sm:p-4 transition-all duration-200">
            <span className="text-sm font-medium text-blue-700">Active filters:</span>

            {selectedGame && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 transition-all duration-200">
                Game: {selectedGame}
                <button
                  onClick={() => {
                    setSelectedGame('');
                    updateSearch('');
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors touch-manipulation"
                  aria-label={`Remove ${selectedGame} filter`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 transition-all duration-200">
                Search: "{searchQuery}"
                <button
                  onClick={() => {
                    setSearchQuery('');
                    updateSearch(selectedGame, '');
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors touch-manipulation"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors touch-manipulation"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Games section */}
        <div className="bg-white rounded-lg px-4 sm:px-6 py-4 sm:py-6 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Featured Games</h3>
              <button
                onClick={fetchRandomGames}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 disabled:text-blue-300 p-1.5 rounded-full 
                           hover:bg-blue-50 transition-colors touch-manipulation disabled:cursor-not-allowed"
                title="Show different games"
                aria-label="Refresh games"
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
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors self-start sm:self-auto"
            >
              See all games →
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