'use client';

import React, { useEffect, useState } from 'react';

export default function GameSelector({ value, onChange, disabled }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="relative w-full">
        <div className="w-full p-2 border rounded bg-gray-50">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div 
        className="w-full p-2 border rounded cursor-pointer flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        <span>{value || 'Select a game'}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 gap-1 p-2">
            {games.map((game) => (
              <button
                key={game.name}
                onClick={() => {
                  onChange(game.name);
                  setOpen(false);
                }}
                disabled={disabled}
                className={`flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg w-full text-left transition-all duration-200
                  ${value === game.name ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
              >
                <div className={`relative ${value === game.name ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                </div>
                <span className="font-medium">{game.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}