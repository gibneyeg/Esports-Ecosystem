import React, { useState, useEffect} from 'react';

const GameList = ({ games, onGameSelect, selectedGame, showAll = false }) => {
    const displayGames = showAll ? games : games.slice(0, 6);
  
    return (
      <div className="w-full px-1">
        <div className="grid grid-cols-6 gap-4">
          {displayGames.map((game) => (
            <div key={game.name} className="w-full">
              <button
                onClick={() => onGameSelect(game.name)}
                className={`w-full flex flex-col ${
                  selectedGame === game.name ? 'scale-105 transition-transform duration-200' : ''
                }`}
              >
                <div className={`w-full aspect-[3/4] rounded-lg overflow-hidden border-2 transition-colors duration-200 ${
                  selectedGame === game.name ? 'border-blue-500' : 'border-transparent'
                }`}>
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className={`mt-2 text-sm ${
                  selectedGame === game.name ? 'text-blue-500 font-medium' : ''
                }`}>
                  {game.name}
                </span>
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
  const [showAllGames, setShowAllGames] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      try {
        const response = await fetch('/api/games');
        const data = await response.json();
        setGames(data);
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, []);

  const handleGameSelect = (gameName) => {
    // If clicking the same game, reset everything
    if (selectedGame === gameName) {
      setSelectedGame('');
      setSearchQuery('');
      filterTournaments('');
      return;
    }
    // Otherwise, select the new game
    setSelectedGame(gameName);
    handleSearch('', gameName);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    handleSearch(e.target.value, selectedGame);
  };

  const handleSearch = (query, game) => {
    if (!query.trim() && !game) {
      filterTournaments('');
      return;
    }

    const searchTerms = [];
    if (query.trim()) searchTerms.push(query.toLowerCase());
    if (game) searchTerms.push(game.toLowerCase());

    filterTournaments(searchTerms.join(' '));
  };

  if (loading) {
    return <div>Loading games...</div>;
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto mb-12">
      <div className="space-y-6">
        <div className="flex">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="START YOUR SEARCH"
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
          </div>
        </div>

        <div className="bg-white rounded-lg px-6 py-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-medium">Games</h3>
            <button 
              onClick={() => setShowAllGames(!showAllGames)}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              See All
            </button>
          </div>
          <GameList 
            games={games}
            onGameSelect={handleGameSelect} 
            selectedGame={selectedGame}
            showAll={showAllGames}
          />
        </div>
      </div>
    </div>
  );
}