import React from 'react';

const TournamentFormatSelector = ({ value, onChange, disabled }) => {
  const formats = [
    {
      id: "SINGLE_ELIMINATION",
      name: "Single Elimination",
      description: "Traditional bracket format. Players are eliminated after one loss.",
      icon: "🏆"
    },
    {
      id: "DOUBLE_ELIMINATION",
      name: "Double Elimination",
      description: "Players move to losers bracket after first loss, eliminated after second loss.",
      icon: "🔄"
    },
    {
      id: "ROUND_ROBIN",
      name: "Round Robin",
      description: "Every player faces every other player in their group.",
      icon: "🔁"
    },
    {
      id: "SWISS",
      name: "Swiss System",
      description: "Players face others with similar win-loss records.",
      icon: "🎯"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {formats.map((format) => (
        <div
          key={format.id}
          className={`p-4 border rounded-lg cursor-pointer transition-all ${
            value === format.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-blue-200"
          }`}
          onClick={() => !disabled && onChange(format.id)}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{format.icon}</span>
            <h3 className="font-medium text-gray-900">{format.name}</h3>
          </div>
          <p className="text-sm text-gray-500">{format.description}</p>
        </div>
      ))}
    </div>
  );
};

export default TournamentFormatSelector;
