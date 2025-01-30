import React, { useState } from 'react';

const GameSelector = ({ value, onChange, disabled }) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const popularGames = [
    "League of Legends",
    "Dota 2",
    "CS:GO",
    "Valorant",
    "Rocket League",
    "Fortnite",
    "Call of Duty: Warzone",
    "Super Smash Bros",
    "FIFA 24",
    "Other"
  ];

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    setShowCustomInput(selectedValue === 'Other');
    if (selectedValue !== 'Other') {
      onChange(selectedValue);
    }
  };

  const handleCustomInputChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-4">
      <select
        value={showCustomInput ? 'Other' : value}
        onChange={handleSelectChange}
        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
        disabled={disabled}
      >
        <option value="">Select a game</option>
        {popularGames.map((game) => (
          <option key={game} value={game}>
            {game}
          </option>
        ))}
      </select>

      {showCustomInput && (
        <input
          type="text"
          value={value}
          onChange={handleCustomInputChange}
          placeholder="Enter game name"
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
      )}
    </div>
  );
};

export default GameSelector;