
/**
 * Fetches existing bracket data for a tournament
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object>} Bracket data
 */
export const fetchExistingBracket = async (tournamentId) => {
  try {
    const response = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bracket: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bracket:", error);
    return null;
  }
};

/**
 * Prepares bracket data for saving to the API
 * @param {Array} winnersBracket - Winners bracket data
 * @param {Array} losersBracket - Losers bracket data (for double elimination)
 * @param {Object} grandFinals - Grand finals data (for double elimination)
 * @param {Object} resetMatch - Reset match data (for double elimination)
 * @param {Object} tournamentWinner - Tournament winner
 * @returns {Object} Formatted data for API
 */
export const prepareBracketDataForSave = (
  winnersBracket,
  losersBracket = null,
  grandFinals = null,
  resetMatch = null,
  tournamentWinner = null
) => {
  const matches = [];

  // Process winners bracket
  if (winnersBracket) {
    winnersBracket.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        matches.push({
          round: roundIndex,
          position: matchIndex,
          matchIndex: matchIndex, // Add matchIndex for position field
          player1: match.slots[0].participant,
          player2: match.slots[1].participant,
          winnerId: null, // Will be set later if a winner is determined
          isThirdPlaceMatch: false
        });
      });
    });
  }

  // Process losers bracket for double elimination
  if (losersBracket) {
    const winnersRoundCount = winnersBracket.length;

    losersBracket.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        matches.push({
          round: winnersRoundCount + roundIndex,
          position: matchIndex,
          matchIndex: matchIndex, // Add matchIndex for position field
          player1: match.slots[0].participant,
          player2: match.slots[1].participant,
          winnerId: null,
          isThirdPlaceMatch: false
        });
      });
    });
  }

  // Add grand finals match for double elimination
  if (grandFinals) {
    const totalRounds = (winnersBracket ? winnersBracket.length : 0) +
      (losersBracket ? losersBracket.length : 0);

    matches.push({
      round: totalRounds,
      position: 0,
      matchIndex: 0, // Add matchIndex for position field
      player1: grandFinals.slots[0].participant,
      player2: grandFinals.slots[1].participant,
      winnerId: null,
      isThirdPlaceMatch: false
    });
  }

  // Add reset match for double elimination if needed
  if (resetMatch) {
    const totalRounds = (winnersBracket ? winnersBracket.length : 0) +
      (losersBracket ? losersBracket.length : 0);

    matches.push({
      round: totalRounds + 1,
      position: 0,
      matchIndex: 0, // Add matchIndex for position field
      player1: resetMatch.slots[0].participant,
      player2: resetMatch.slots[1].participant,
      winnerId: null,
      isThirdPlaceMatch: false
    });
  }

  // Determine winners if available
  const winners = [];

  if (tournamentWinner) {
    matches.forEach(match => {
      // Check if this match has the tournament winner
      if (match.player1 && match.player1.id === tournamentWinner.id) {
        match.winnerId = tournamentWinner.id;
      } else if (match.player2 && match.player2.id === tournamentWinner.id) {
        match.winnerId = tournamentWinner.id;
      }
    });

    // Add to winners list
    winners.push({
      userId: tournamentWinner.id,
      position: 1,
      prizeMoney: 0 // This will be calculated on the server
    });
  }

  return {
    matches,
    winners,
    tournamentWinnerId: tournamentWinner?.id || null
  };
};

/**
 * Helper function to prepare Swiss bracket data for saving
 * @param {Object} bracketData - Complete Swiss bracket data
 * @returns {Object} - Formatted data for API
 */
export const prepareSwissBracketForSave = (bracketData) => {
  return {
    format: 'SWISS',
    ...bracketData
  };
};