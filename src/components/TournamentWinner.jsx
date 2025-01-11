import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

const TournamentWinner = ({ tournament, onWinnerDeclared }) => {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [winners, setWinners] = useState({
    first: '',
    second: '',
    third: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getDisplayName = (user) => {
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) return user.email.split('@')[0];
    return 'Anonymous User';
  };

  const handleDeclareWinners = async () => {
    if (!winners.first) {
      setError('Please select at least a first place winner');
      return;
    }

    // Validate no duplicate winners
    const selectedWinners = Object.values(winners).filter(Boolean);
    if (new Set(selectedWinners).size !== selectedWinners.length) {
      setError('Each player can only win one position');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/winners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winners: [
            { userId: winners.first, position: 1, prizeMoney: tournament.prizePool * 0.5 },
            ...(winners.second ? [{ userId: winners.second, position: 2, prizeMoney: tournament.prizePool * 0.3 }] : []),
            ...(winners.third ? [{ userId: winners.third, position: 3, prizeMoney: tournament.prizePool * 0.2 }] : [])
          ]
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to declare winners');
      }

      setShowModal(false);
      if (onWinnerDeclared) {
        onWinnerDeclared(data.tournament);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If tournament already has winners, show the results
  if (tournament.winners?.length > 0) {
    return (
      <div className="px-6 py-4 bg-green-100 text-green-800 rounded-lg border border-green-200">
        <h3 className="font-semibold mb-2">Tournament Results</h3>
        <div className="space-y-2">
          {tournament.winners
            .sort((a, b) => a.position - b.position)
            .map((winner) => (
              <div key={winner.id} className="flex justify-between items-center">
                <span>
                  {winner.position === 1 && '🥇'}
                  {winner.position === 2 && '🥈'}
                  {winner.position === 3 && '🥉'}
                  {' '}
                  {getDisplayName(winner.user)}
                </span>
                <span className="text-green-600 font-medium">
                  ${winner.prizeMoney.toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
      >
        Declare Winners
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex">
          <div className="relative p-8 bg-white w-full max-w-md m-auto flex-col flex rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Tournament Winners</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              {/* First Place */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🥇 First Place (${(tournament.prizePool * 0.5).toLocaleString()})
                </label>
                <select
                  value={winners.first}
                  onChange={(e) => setWinners(prev => ({ ...prev, first: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select player</option>
                  {tournament.participants.map((participant) => (
                    <option key={participant.userId} value={participant.userId}>
                      {participant.user.name || participant.user.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Second Place */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🥈 Second Place (${(tournament.prizePool * 0.3).toLocaleString()})
                </label>
                <select
                  value={winners.second}
                  onChange={(e) => setWinners(prev => ({ ...prev, second: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select player</option>
                  {tournament.participants.map((participant) => (
                    <option key={participant.userId} value={participant.userId}>
                      {participant.user.name || participant.user.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Third Place */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🥉 Third Place (${(tournament.prizePool * 0.2).toLocaleString()})
                </label>
                <select
                  value={winners.third}
                  onChange={(e) => setWinners(prev => ({ ...prev, third: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select player</option>
                  {tournament.participants.map((participant) => (
                    <option key={participant.userId} value={participant.userId}>
                      {participant.user.name || participant.user.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeclareWinners}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Declaring...' : 'Declare Winners'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TournamentWinner;