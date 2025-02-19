import React, { useState, useEffect, useRef, useCallback } from 'react';

// Custom debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const GameSelector = ({ value, onChange, disabled }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const dropdownRef = useRef(null);
  const observerRef = useRef(null);
  const lastGameRef = useRef(null);

  const fetchGames = useCallback(async (search, newOffset = 0, append = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: search || '',
        offset: newOffset.toString(),
        limit: '20'
      });

      const response = await fetch(`/api/games?${params}`);
      if (!response.ok) throw new Error('Failed to fetch games');
      
      const data = await response.json();
      
      setGames(prev => append ? [...prev, ...data.games] : data.games);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setOffset(newOffset);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      setOffset(0);
      fetchGames(query, 0, false);
    }, 300),
    []
  );

  useEffect(() => {
    if (isOpen && games.length === 0) {
      fetchGames('', 0, false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchGames(searchQuery, offset + 20, true);
        }
      },
      { threshold: 0.5 }
    );

    if (lastGameRef.current) {
      observer.observe(lastGameRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, hasMore, loading, offset, searchQuery]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleSelect = (game) => {
    onChange(game.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectedGame = games.find(game => game.name === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center flex-1">
          {selectedGame ? (
            <>
              <div className="w-8 h-8 mr-2 rounded overflow-hidden">
                <img
                  src={selectedGame.image}
                  alt={selectedGame.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span>{selectedGame.name}</span>
            </>
          ) : (
            <span className="text-gray-500">Select a game</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {games.map((game, index) => (
              <div
                key={game.id}
                ref={index === games.length - 1 ? lastGameRef : null}
                className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(game)}
              >
                <div className="w-8 h-8 mr-2 rounded overflow-hidden">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{game.name}</div>
                  <div className="flex items-center space-x-2">
                    {game.releaseDate && (
                      <span className="text-xs text-gray-500">
                        {game.releaseDate}
                      </span>
                    )}
                    {game.genres?.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {game.genres.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                {game.rating && (
                  <div className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                    {game.rating}%
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {!loading && games.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No games found
              </div>
            )}
          </div>
          
          {total > 0 && (
            <div className="p-2 border-t text-xs text-gray-500 text-center">
              Showing {games.length} of {total} games
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameSelector;