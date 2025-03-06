export const initializeBracket = (participantCount, format = 'SINGLE_ELIMINATION') => {

  const totalWinnersRounds = Math.ceil(Math.log2(participantCount));

  const firstRoundMatches = Math.ceil(participantCount / 2);



  const newWinnersBracket = [];

  const winnersMatchesByRound = [];



  // Create winners bracket rounds

  for (let r = 0; r < totalWinnersRounds; r++) {

    let matchesInRound = Math.ceil(firstRoundMatches / Math.pow(2, r));

    winnersMatchesByRound.push(matchesInRound);



    const matches = [];

    for (let m = 0; m < matchesInRound; m++) {

      matches.push({

        id: `winners-${r}-${m}`,

        round: r,

        position: m,

        bracketType: 'winners',

        slots: [

          { id: `winners-slot-${r}-${m}-0`, participant: null },

          { id: `winners-slot-${r}-${m}-1`, participant: null }

        ]

      });

    }



    newWinnersBracket.push({

      id: `winners-round-${r}`,

      name: r === 0 ? 'Round 1' :

        r === totalWinnersRounds - 1 ? 'Finals' :

          `Round ${r + 1}`,

      matches: matches

    });

  }



  // For single elimination, return only winners bracket

  if (format === 'SINGLE_ELIMINATION') {

    return {

      winnersBracket: newWinnersBracket,

      losersBracket: [],

      grandFinals: null,

      resetMatch: null

    };

  }



  // For double elimination, create losers bracket as well

  const totalLosersRounds = 2 * totalWinnersRounds - 1;

  const newLosersBracket = [];

  const losersMatchesByRound = [];



  // Double elimination follows a specific pattern:

  // 1. First round has half as many matches as first winners round

  losersMatchesByRound[0] = Math.floor(winnersMatchesByRound[0] / 2);



  // 2. For subsequent rounds, alternating between consolidation and drop-down

  for (let r = 1; r < totalLosersRounds; r++) {

    if (r % 2 === 1) {

      // Consolidation rounds: halve the number of matches from previous round

      losersMatchesByRound[r] = Math.ceil(losersMatchesByRound[r - 1] / 2);

    } else {

      // Drop-down rounds: same number of matches as the consolidation round before

      // plus matches from the corresponding winners round

      const winnersRound = r / 2;

      if (winnersRound < winnersMatchesByRound.length) {

        losersMatchesByRound[r] = losersMatchesByRound[r - 1] + Math.floor(winnersMatchesByRound[winnersRound] / 2);

      } else {

        losersMatchesByRound[r] = losersMatchesByRound[r - 1];

      }

    }



    // Always ensure at least 1 match per round

    losersMatchesByRound[r] = Math.max(1, losersMatchesByRound[r]);

  }



  // Last round is always just 1 match (losers finals)

  losersMatchesByRound[totalLosersRounds - 1] = 1;



  // Create matches for each round

  for (let r = 0; r < totalLosersRounds; r++) {

    const matchesInRound = losersMatchesByRound[r];



    const matches = [];

    for (let m = 0; m < matchesInRound; m++) {

      matches.push({

        id: `losers-${r}-${m}`,

        round: r,

        position: m,

        bracketType: 'losers',

        slots: [

          { id: `losers-slot-${r}-${m}-0`, participant: null },

          { id: `losers-slot-${r}-${m}-1`, participant: null }

        ]

      });

    }



    newLosersBracket.push({

      id: `losers-round-${r}`,

      name: r === totalLosersRounds - 1 ? 'Losers Finals' : `Losers Round ${r + 1}`,

      matches: matches

    });

  }



  // Create grand finals and reset match structures

  const grandFinalsMatch = {

    id: 'grand-finals',

    round: 0,

    position: 0,

    bracketType: 'finals',

    slots: [

      { id: 'grand-finals-slot-0', participant: null },

      { id: 'grand-finals-slot-1', participant: null }

    ]

  };



  const resetMatchData = {

    id: 'reset-match',

    round: 0,

    position: 0,

    bracketType: 'reset',

    slots: [

      { id: 'reset-match-slot-0', participant: null },

      { id: 'reset-match-slot-1', participant: null }

    ]

  };



  return {

    winnersBracket: newWinnersBracket,

    losersBracket: newLosersBracket,

    grandFinals: grandFinalsMatch,

    resetMatch: resetMatchData

  };

};



// Get the next winners bracket match for advancement

export const getNextWinnersMatch = (winnersBracket, currentRound, currentPosition, tournamentFormat, grandFinals) => {

  const nextRound = currentRound + 1;



  if (nextRound >= winnersBracket.length) {

    if (tournamentFormat === 'DOUBLE_ELIMINATION') {

      return {

        type: 'finals',

        match: grandFinals,

        slotIndex: 0

      };

    }

    return null;

  }



  const nextPosition = Math.floor(currentPosition / 2);

  const isFirstSlot = currentPosition % 2 === 0;



  if (nextPosition >= winnersBracket[nextRound].matches.length) {

    return null;

  }



  return {

    type: 'winners',

    match: winnersBracket[nextRound].matches[nextPosition],

    slotIndex: isFirstSlot ? 0 : 1

  };

};



// Get the match where a loser from winners bracket should be placed

export const getDropToLosersMatch = (winnersBracket, losersBracket, winnersRound, winnersPosition) => {

  const losersRoundMap = {};



  for (let i = 0; i < winnersBracket.length; i++) {

    losersRoundMap[i] = i * 2;

  }



  const targetLosersRound = losersRoundMap[winnersRound];



  if (targetLosersRound >= losersBracket.length) {

    return null;

  }



  const matchCountInTargetRound = losersBracket[targetLosersRound].matches.length;

  const loserPos = winnersPosition % matchCountInTargetRound;



  if (loserPos >= matchCountInTargetRound) {

    return null;

  }



  const targetMatch = losersBracket[targetLosersRound].matches[loserPos];



  let slotIndex = -1;

  for (let i = 0; i < targetMatch.slots.length; i++) {

    if (!targetMatch.slots[i].participant) {

      slotIndex = i;

      break;

    }

  }



  if (slotIndex === -1) {

    for (let m = 0; m < losersBracket[targetLosersRound].matches.length; m++) {

      const match = losersBracket[targetLosersRound].matches[m];

      for (let s = 0; s < match.slots.length; s++) {

        if (!match.slots[s].participant) {

          return {

            type: 'losers',

            match: match,

            slotIndex: s

          };

        }

      }

    }



    if (targetLosersRound + 1 < losersBracket.length) {

      const nextRoundMatch = losersBracket[targetLosersRound + 1].matches[0];

      if (nextRoundMatch && nextRoundMatch.slots[0] && !nextRoundMatch.slots[0].participant) {

        return {

          type: 'losers',

          match: nextRoundMatch,

          slotIndex: 0

        };

      }

    }



    return null;

  }



  return {

    type: 'losers',

    match: targetMatch,

    slotIndex: slotIndex

  };

};



// Get the next losers bracket match for advancement

export const getNextLosersMatch = (losersBracket, currentRound, currentPosition, grandFinals) => {

  const nextRound = currentRound + 1;



  if (nextRound >= losersBracket.length) {

    return {

      type: 'finals',

      match: grandFinals,

      slotIndex: 1

    };

  }



  let nextPosition;

  if (currentRound % 2 === 0) {

    nextPosition = Math.floor(currentPosition / 2);

  } else {

    const matchesInCurrentRound = losersBracket[currentRound].matches.length;

    const matchesInNextRound = losersBracket[nextRound].matches.length;



    if (matchesInCurrentRound === matchesInNextRound) {

      nextPosition = currentPosition;

    } else {

      nextPosition = Math.floor(currentPosition / 2);

    }

  }



  if (nextPosition >= losersBracket[nextRound].matches.length) {

    for (let i = 0; i < losersBracket[nextRound].matches.length; i++) {

      const match = losersBracket[nextRound].matches[i];

      if (!match.slots[0].participant) {

        return {

          type: 'losers',

          match: match,

          slotIndex: 0

        };

      }

      if (!match.slots[1].participant) {

        return {

          type: 'losers',

          match: match,

          slotIndex: 1

        };

      }

    }

    return null;

  }



  const isFirstSlot = currentPosition % 2 === 0;

  const targetMatch = losersBracket[nextRound].matches[nextPosition];



  const slotIndex = isFirstSlot ? 0 : 1;

  if (!targetMatch.slots[slotIndex].participant) {

    return {

      type: 'losers',

      match: targetMatch,

      slotIndex: slotIndex

    };

  }



  const otherSlotIndex = slotIndex === 0 ? 1 : 0;

  if (!targetMatch.slots[otherSlotIndex].participant) {

    return {

      type: 'losers',

      match: targetMatch,

      slotIndex: otherSlotIndex

    };

  }



  for (let i = 0; i < losersBracket[nextRound].matches.length; i++) {

    const match = losersBracket[nextRound].matches[i];

    if (!match.slots[0].participant) {

      return {

        type: 'losers',

        match: match,

        slotIndex: 0

      };

    }

    if (!match.slots[1].participant) {

      return {

        type: 'losers',

        match: match,

        slotIndex: 1

      };

    }

  }



  return null;

};