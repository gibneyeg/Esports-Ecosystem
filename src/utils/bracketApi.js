// Make sure fetchExistingBracket is properly exported
export const fetchExistingBracket = async (tournamentId) => {
  try {
    const response = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching bracket:", error);
    return null;
  }
};

// Transform the raw bracket data from API to the format used in the app
export const transformBracketData = (bracketData) => {
  if (!bracketData || !bracketData.rounds || bracketData.rounds.length === 0) {
    return null;
  }

  // Sort rounds based on their IDs to ensure proper order
  const matches = bracketData.rounds.flatMap(round =>
    round.matches.map(match => ({
      ...match,
      roundId: round.id,
      roundName: round.name
    }))
  );

  return {
    matches: matches,
    tournamentWinnerId: bracketData.tournamentWinnerId || null
  };
};

export const prepareBracketDataForSave = (winnersBracket, losersBracket = [], grandFinals = null, resetMatch = null, tournamentWinner = null) => {
  const rounds = [];

  // Calculate total winners rounds for proper round numbering
  const totalWinnersRounds = winnersBracket.length;

  // Add winners bracket rounds - Rounds 0 to totalWinnersRounds-1
  winnersBracket.forEach((roundData, roundIndex) => {
    const matches = roundData.matches.map((match, matchIndex) => {
      // Determine if this match has a winner
      let winnerId = null;

      // If it's the final round, check if we have a tournament winner
      const isFinal = roundIndex === winnersBracket.length - 1;

      if (isFinal && tournamentWinner && match.slots.some(slot =>
        slot.participant && slot.participant.id === tournamentWinner.id)) {
        winnerId = tournamentWinner.id;
      } else {
        // For non-final rounds, check if any participant advanced to the next round
        const nextRound = roundIndex + 1;
        if (nextRound < winnersBracket.length) {
          const nextMatchPos = Math.floor(matchIndex / 2);

          if (nextMatchPos < winnersBracket[nextRound].matches.length) {
            const nextMatch = winnersBracket[nextRound].matches[nextMatchPos];

            for (const slot of nextMatch.slots) {
              if (slot.participant && match.slots.some(currentSlot =>
                currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {
                winnerId = slot.participant.id;
                break;
              }
            }
          }
        }
      }

      // Also determine who lost and dropped to losers bracket
      let loserId = null;
      if (winnerId && match.slots[0].participant && match.slots[1].participant) {
        loserId = match.slots[0].participant.id === winnerId ?
          match.slots[1].participant.id : match.slots[0].participant.id;
      }

      return {
        id: match.id, // Original ID  but not used by database
        round: roundIndex, // Actual round number in the database - WINNERS BRACKET: 0 to n-1
        position: matchIndex,
        player1: match.slots[0].participant ? {
          id: match.slots[0].participant.id,
          participantId: match.slots[0].participant.participantId || match.slots[0].participant.id
        } : null,
        player2: match.slots[1].participant ? {
          id: match.slots[1].participant.id,
          participantId: match.slots[1].participant.participantId || match.slots[1].participant.id
        } : null,
        winnerId: winnerId,
        loserId: loserId  // Add the loser ID to track who drops to losers bracket
      };
    });

    rounds.push({
      id: roundData.id,
      name: roundData.name,
      matches: matches
    });
  });



  if (losersBracket && losersBracket.length > 0) {
    losersBracket.forEach((roundData, roundIndex) => {

      const matches = roundData.matches.map((match, matchIndex) => {
        let winnerId = null;

        const nextRound = roundIndex + 1;
        if (nextRound < losersBracket.length) {
          for (const nextMatch of losersBracket[nextRound].matches) {
            for (const slot of nextMatch.slots) {
              if (slot.participant && match.slots.some(currentSlot =>
                currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {
                winnerId = slot.participant.id;
                break;
              }
            }
            if (winnerId) break;
          }
        }

        // For losers finals specifically, check if player advanced to grand finals
        if (roundIndex === losersBracket.length - 1) {
          if (grandFinals && grandFinals.slots[1].participant) {
            for (const slot of match.slots) {
              if (slot.participant && slot.participant.id === grandFinals.slots[1].participant.id) {
                winnerId = slot.participant.id;
                break;
              }
            }
          }
        }

        return {
          id: match.id,
          round: totalWinnersRounds + roundIndex,
          position: matchIndex,
          player1: match.slots[0].participant ? {
            id: match.slots[0].participant.id,
            participantId: match.slots[0].participant.participantId || match.slots[0].participant.id
          } : null,
          player2: match.slots[1].participant ? {
            id: match.slots[1].participant.id,
            participantId: match.slots[1].participant.participantId || match.slots[1].participant.id
          } : null,
          winnerId: winnerId
        };
      });

      // Always add this round even if matches appear empty
      rounds.push({
        id: roundData.id,
        name: roundData.name,
        matches: matches
      });
    });
  }

  // Add grand finals - Round 2*totalWinnersRounds
  if (grandFinals) {

    // Determine the winner of grand finals
    let grandFinalsWinnerId = null;

    if (resetMatch && resetMatch.slots[0].participant && resetMatch.slots[1].participant) {
      if (tournamentWinner) {
        grandFinalsWinnerId = tournamentWinner.id;
      }
    } else if (tournamentWinner && grandFinals.slots.some(slot =>
      slot.participant && slot.participant.id === tournamentWinner.id)) {
      // Tournament winner exists and is in grand finals
      grandFinalsWinnerId = tournamentWinner.id;
    }

    rounds.push({
      id: "grand-finals-round",
      name: "Grand Finals",
      matches: [{
        id: "grand-finals",
        round: totalWinnersRounds * 2, // GRAND FINALS round is 2*totalWinnersRounds
        position: 0,
        player1: grandFinals.slots[0].participant ? {
          id: grandFinals.slots[0].participant.id,
          participantId: grandFinals.slots[0].participant.participantId || grandFinals.slots[0].participant.id
        } : null,
        player2: grandFinals.slots[1].participant ? {
          id: grandFinals.slots[1].participant.id,
          participantId: grandFinals.slots[1].participant.participantId || grandFinals.slots[1].participant.id
        } : null,
        winnerId: grandFinalsWinnerId
      }]
    });
  }

  // Add reset match - Round 2*totalWinnersRounds+1
  if (resetMatch) {

    let resetWinnerId = null;
    if (tournamentWinner && resetMatch.slots.some(slot =>
      slot.participant && slot.participant.id === tournamentWinner.id)) {
      resetWinnerId = tournamentWinner.id;
    }

    rounds.push({
      id: "reset-match-round",
      name: "Reset Match",
      matches: [{
        id: "reset-match",
        round: totalWinnersRounds * 2 + 1, // RESET MATCH round is 2*totalWinnersRounds+1
        position: 0,
        player1: resetMatch.slots[0].participant ? {
          id: resetMatch.slots[0].participant.id,
          participantId: resetMatch.slots[0].participant.participantId || resetMatch.slots[0].participant.id
        } : null,
        player2: resetMatch.slots[1].participant ? {
          id: resetMatch.slots[1].participant.id,
          participantId: resetMatch.slots[1].participant.participantId || resetMatch.slots[1].participant.id
        } : null,
        winnerId: resetWinnerId
      }]
    });
  }

  return {
    rounds: rounds,
    tournamentWinnerId: tournamentWinner ? tournamentWinner.id : null
  };
};