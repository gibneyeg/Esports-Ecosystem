import React from 'react';

const FormatSettings = ({ format, settings, onChange, disabled }) => {
  if (!format) return null;

  switch (format) {
    case 'SWISS':
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="numberOfRounds" className="block mb-2">
              Number of Rounds
            </label>
            <input
              type="number"
              id="numberOfRounds"
              value={settings.numberOfRounds || ''}
              onChange={(e) => onChange({ ...settings, numberOfRounds: parseInt(e.target.value) })}
              min={3}
              max={10}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
            />
            <p className="text-sm text-gray-500 mt-1">
              Recommended: {Math.ceil(Math.log2(settings.maxPlayers || 0))} rounds
            </p>
          </div>
        </div>
      );

    case 'ROUND_ROBIN':
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="groupSize" className="block mb-2">
              Players per Group
            </label>
            <input
              type="number"
              id="groupSize"
              value={settings.groupSize || ''}
              onChange={(e) => onChange({ ...settings, groupSize: parseInt(e.target.value) })}
              min={3}
              max={8}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              disabled={disabled}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default FormatSettings;
