"use client";

import React, { useState, useEffect } from 'react';
import { initializeBracket } from '@/utils/bracketUtils';
import { fetchExistingBracket } from '@/utils/bracketApi';
import { prepareBracketDataForSave } from '@/utils/bracketApi';
import { findParticipantById } from '@/utils/participantUtils';

const SingleEliminationBracket = ({
  tournament,
  participants,
  setParticipants,
  selectedParticipant,
  setSelectedParticipant,
  setTournamentWinner,
  tournamentWinner, // Add tournamentWinner as a prop
  setRunnerUp,
  runnerUp, // Add runnerUp as a prop
  setThirdPlace,
  thirdPlace, // Add thirdPlace as a prop
  viewOnly,
  saveBracket
}) => {
  const [winnersBracket, setWinnersBracket] = useState([]);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(null);
  const [semiFinalsLosers, setSemiFinalsLosers] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize bracket when component mounts
  useEffect(() => {
    if (isInitialized) return;

    const initializeTournamentBracket = async () => {
      if (!tournament || !participants.length) return;

      const bracketData = await fetchExistingBracket(tournament.id);

      if (bracketData && bracketData.matches && bracketData.matches.length > 0) {
        // Load existing bracket
        const { winnersBracket } = initializeBracket(participants.length, 'SINGLE_ELIMINATION');
        const updatedWinnersBracket = [...winnersBracket];

        // Create a map of matches by round and position for easier access
        const matchesByRoundAndPosition = {};
        bracketData.matches.forEach(match => {
          if (!match.isThirdPlaceMatch) { // Skip third place match, handle separately
            if (!matchesByRoundAndPosition[match.round]) {
              matchesByRoundAndPosition[match.round] = {};
            }
            matchesByRoundAndPosition[match.round][match.position] = match;
          }
        });

        // Go through each round and populate match slots
        for (let roundIndex = 0; roundIndex < updatedWinnersBracket.length; roundIndex++) {
          const roundMatches = updatedWinnersBracket[roundIndex].matches;

          for (let matchIndex = 0; matchIndex < roundMatches.length; matchIndex++) {
            const currentMatch = roundMatches[matchIndex];
            const savedMatch = matchesByRoundAndPosition[roundIndex] ?
              matchesByRoundAndPosition[roundIndex][matchIndex] : null;

            if (savedMatch) {
              // Populate player 1 slot
              if (savedMatch.player1) {
                const participant = findParticipantById(participants, savedMatch.player1.id);
                if (participant) {
                  currentMatch.slots[0].participant = participant;

                  // Mark participant as placed
                  const partIndex = participants.findIndex(p => p.id === participant.id);
                  if (partIndex >= 0 && !participants[partIndex].isPlaced) {
                    participants[partIndex].isPlaced = true;
                  }
                }
              }

              // Populate player 2 slot
              if (savedMatch.player2) {
                const participant = findParticipantById(participants, savedMatch.player2.id);
                if (participant) {
                  currentMatch.slots[1].participant = participant;

                  // Mark participant as placed
                  const partIndex = participants.findIndex(p => p.id === participant.id);
                  if (partIndex >= 0 && !participants[partIndex].isPlaced) {
                    participants[partIndex].isPlaced = true;
                  }
                }
              }
            }
          }
        }

        setWinnersBracket(updatedWinnersBracket);

        // Find semi-finalists to determine who should be in the third place match
        const semiFinalRoundIndex = updatedWinnersBracket.length - 2;
        let potentialThirdPlaceContestants = [];

        if (semiFinalRoundIndex >= 0) {
          const semiFinalsMatches = updatedWinnersBracket[semiFinalRoundIndex].matches;
          const finalsMatches = updatedWinnersBracket[updatedWinnersBracket.length - 1].matches;

          // Find finalists (to exclude them from third place match)
          let finalistIds = [];
          if (finalsMatches.length > 0) {
            if (finalsMatches[0].slots[0].participant) {
              finalistIds.push(finalsMatches[0].slots[0].participant.id);
            }
            if (finalsMatches[0].slots[1].participant) {
              finalistIds.push(finalsMatches[0].slots[1].participant.id);
            }
          }

          // Find semi-finalists who didn't make it to finals
          semiFinalsMatches.forEach(match => {
            if (match.slots[0].participant && !finalistIds.includes(match.slots[0].participant.id)) {
              potentialThirdPlaceContestants.push(match.slots[0].participant);
            }
            if (match.slots[1].participant && !finalistIds.includes(match.slots[1].participant.id)) {
              potentialThirdPlaceContestants.push(match.slots[1].participant);
            }
          });
        }

        // Look for third place match
        const thirdPlaceMatches = bracketData.matches.filter(match => match.isThirdPlaceMatch);

        if (thirdPlaceMatches.length > 0) {
          const thirdPlaceMatchData = thirdPlaceMatches[0];
          const newThirdPlaceMatch = {
            id: "third-place-match",
            name: "Third Place Match",
            slots: [
              { id: "third-place-slot-0", participant: null },
              { id: "third-place-slot-1", participant: null }
            ]
          };

          // If existing third place match data has participants, use them
          if (thirdPlaceMatchData.player1) {
            const participant = findParticipantById(participants, thirdPlaceMatchData.player1.id);
            if (participant) {
              newThirdPlaceMatch.slots[0].participant = participant;

              // Mark participant as placed
              const partIndex = participants.findIndex(p => p.id === participant.id);
              if (partIndex >= 0 && !participants[partIndex].isPlaced) {
                participants[partIndex].isPlaced = true;
              }
            }
          } else if (potentialThirdPlaceContestants.length > 0) {
            // If no player1 in saved data but we have semi-finalists, use the first one
            newThirdPlaceMatch.slots[0].participant = potentialThirdPlaceContestants[0];

            // Mark participant as placed
            const partIndex = participants.findIndex(p => p.id === potentialThirdPlaceContestants[0].id);
            if (partIndex >= 0 && !participants[partIndex].isPlaced) {
              participants[partIndex].isPlaced = true;
            }
          }

          if (thirdPlaceMatchData.player2) {
            const participant = findParticipantById(participants, thirdPlaceMatchData.player2.id);
            if (participant) {
              newThirdPlaceMatch.slots[1].participant = participant;

              // Mark participant as placed
              const partIndex = participants.findIndex(p => p.id === participant.id);
              if (partIndex >= 0 && !participants[partIndex].isPlaced) {
                participants[partIndex].isPlaced = true;
              }
            }
          } else if (potentialThirdPlaceContestants.length > 1) {
            // If no player2 in saved data but we have another semi-finalist, use them
            newThirdPlaceMatch.slots[1].participant = potentialThirdPlaceContestants[1];

            // Mark participant as placed
            const partIndex = participants.findIndex(p => p.id === potentialThirdPlaceContestants[1].id);
            if (partIndex >= 0 && !participants[partIndex].isPlaced) {
              participants[partIndex].isPlaced = true;
            }
          }

          setThirdPlaceMatch(newThirdPlaceMatch);

          // Find and track semi-finals losers
          if (potentialThirdPlaceContestants.length > 0) {
            setSemiFinalsLosers(potentialThirdPlaceContestants);
          }
        } else {
          // Initialize a new third place match
          const newThirdPlaceMatch = {
            id: "third-place-match",
            name: "Third Place Match",
            slots: [
              { id: "third-place-slot-0", participant: null },
              { id: "third-place-slot-1", participant: null }
            ]
          };

          // If we have potential contestants from semi-finals, add them
          if (potentialThirdPlaceContestants.length > 0) {
            newThirdPlaceMatch.slots[0].participant = potentialThirdPlaceContestants[0];

            // Mark participant as placed
            const partIndex = participants.findIndex(p => p.id === potentialThirdPlaceContestants[0].id);
            if (partIndex >= 0 && !participants[partIndex].isPlaced) {
              participants[partIndex].isPlaced = true;
            }
          }

          if (potentialThirdPlaceContestants.length > 1) {
            newThirdPlaceMatch.slots[1].participant = potentialThirdPlaceContestants[1];

            // Mark participant as placed
            const partIndex = participants.findIndex(p => p.id === potentialThirdPlaceContestants[1].id);
            if (partIndex >= 0 && !participants[partIndex].isPlaced) {
              participants[partIndex].isPlaced = true;
            }
          }

          setThirdPlaceMatch(newThirdPlaceMatch);

          if (potentialThirdPlaceContestants.length > 0) {
            setSemiFinalsLosers(potentialThirdPlaceContestants);
          }
        }

        // Update participants' placed status and apply the updates
        const updatedParticipants = participants.map(p => ({ ...p }));
        setParticipants(updatedParticipants);

        // Set winners if tournament has completed
        if (tournament.winners && tournament.winners.length > 0) {
          const sortedWinners = tournament.winners.sort((a, b) => a.position - b.position);

          const firstPlaceWinner = sortedWinners.find(w => w.position === 1);
          if (firstPlaceWinner) {
            const winner = findParticipantById(participants, firstPlaceWinner.user.id);
            if (winner) {
              setTournamentWinner(winner);
            }
          }

          const secondPlaceWinner = sortedWinners.find(w => w.position === 2);
          if (secondPlaceWinner) {
            const runner = findParticipantById(participants, secondPlaceWinner.user.id);
            if (runner) {
              setRunnerUp(runner);
            }
          }

          const thirdPlaceWinner = sortedWinners.find(w => w.position === 3);
          if (thirdPlaceWinner) {
            const third = findParticipantById(participants, thirdPlaceWinner.user.id);
            if (third) {
              // Make sure the third place match is initialized before checking slots
              if (!thirdPlaceMatch) {
                // Create a new third place match if it doesn't exist
                const newThirdPlaceMatch = {
                  id: "third-place-match",
                  name: "Third Place Match",
                  slots: [
                    { id: "third-place-slot-0", participant: third },
                    { id: "third-place-slot-1", participant: null }
                  ]
                };
                setThirdPlaceMatch(newThirdPlaceMatch);
              } else {
                // Use the existing third place match
                const updatedThirdPlaceMatch = { ...thirdPlaceMatch };
                let winnerInMatch = false;

                // Check if winner is already in a slot
                if (updatedThirdPlaceMatch.slots[0].participant &&
                  updatedThirdPlaceMatch.slots[0].participant.id === third.id) {
                  winnerInMatch = true;
                } else if (updatedThirdPlaceMatch.slots[1].participant &&
                  updatedThirdPlaceMatch.slots[1].participant.id === third.id) {
                  winnerInMatch = true;
                }

                // If not in a slot, add them to first available slot
                if (!winnerInMatch) {
                  if (!updatedThirdPlaceMatch.slots[0].participant) {
                    updatedThirdPlaceMatch.slots[0].participant = third;
                  } else if (!updatedThirdPlaceMatch.slots[1].participant) {
                    updatedThirdPlaceMatch.slots[1].participant = third;
                  }
                  setThirdPlaceMatch(updatedThirdPlaceMatch);
                }
              }

              // Set the third place winner
              setThirdPlace(third);
            }
          }
        }
      } else {
        // Create a new bracket
        const { winnersBracket } = initializeBracket(participants.length, 'SINGLE_ELIMINATION');
        setWinnersBracket(winnersBracket);

        // Initialize a third place match
        const newThirdPlaceMatch = {
          id: "third-place-match",
          name: "Third Place Match",
          slots: [
            { id: "third-place-slot-0", participant: null },
            { id: "third-place-slot-1", participant: null }
          ]
        };
        setThirdPlaceMatch(newThirdPlaceMatch);
      }

      setIsInitialized(true);
    };

    initializeTournamentBracket();
  }, [tournament, participants, isInitialized, setParticipants, setTournamentWinner, setRunnerUp, setThirdPlace]);

  // Listen for save event
  useEffect(() => {
    const handleSave = () => {
      const bracketData = prepareBracketDataForSaveWithThirdPlace(winnersBracket, thirdPlaceMatch);
      saveBracket(bracketData);
    };

    document.addEventListener('saveSingleEliminationBracket', handleSave);

    return () => {
      document.removeEventListener('saveSingleEliminationBracket', handleSave);
    };
  }, [winnersBracket, thirdPlaceMatch, saveBracket]);

  // Helper function to prepare bracket data including third place match
  const prepareBracketDataForSaveWithThirdPlace = (winnersBracket, thirdPlaceMatch) => {
    // First get the standard bracket data
    const standardBracketData = prepareBracketDataForSave(winnersBracket);

    // Ensure the matches array exists
    if (!standardBracketData.matches) {
      standardBracketData.matches = [];
    }

    // Add third place match if it has participants
    if (thirdPlaceMatch) {
      const thirdPlaceMatchData = {
        round: winnersBracket.length, // Same level as finals but marked as third place
        position: 0,
        isThirdPlaceMatch: true,
        player1: thirdPlaceMatch.slots[0].participant
          ? { id: thirdPlaceMatch.slots[0].participant.id }
          : null,
        player2: thirdPlaceMatch.slots[1].participant
          ? { id: thirdPlaceMatch.slots[1].participant.id }
          : null,
        // Add winner information if available
        winnerId: thirdPlace ? thirdPlace.id : null
      };

      standardBracketData.matches.push(thirdPlaceMatchData);
    }

    return standardBracketData;
  };

  const handleSlotClick = (slotId, isThirdPlace = false) => {
    if (viewOnly) return;

    if (!selectedParticipant) {
      // If no participant is selected, check if we need to remove one
      if (isThirdPlace) {
        if (!thirdPlaceMatch) return;

        const updatedThirdPlaceMatch = { ...thirdPlaceMatch };
        let participantRemoved = false;

        for (let s = 0; s < updatedThirdPlaceMatch.slots.length; s++) {
          const slot = updatedThirdPlaceMatch.slots[s];

          if (slot.id === slotId && slot.participant) {
            const updatedParticipants = [...participants];
            const partIndex = updatedParticipants.findIndex(p =>
              p.id === slot.participant.id
            );

            if (partIndex >= 0) {
              updatedParticipants[partIndex].isPlaced = false;
              setParticipants(updatedParticipants);
            }

            slot.participant = null;
            participantRemoved = true;
            break;
          }
        }

        if (participantRemoved) {
          setThirdPlaceMatch(updatedThirdPlaceMatch);
        }
      } else {
        const updatedWinnersBracket = [...winnersBracket];
        let participantRemoved = false;

        outerLoop: for (let r = 0; r < updatedWinnersBracket.length; r++) {
          for (let m = 0; m < updatedWinnersBracket[r].matches.length; m++) {
            for (let s = 0; s < updatedWinnersBracket[r].matches[m].slots.length; s++) {
              const slot = updatedWinnersBracket[r].matches[m].slots[s];

              if (slot.id === slotId && slot.participant) {
                const updatedParticipants = [...participants];
                const partIndex = updatedParticipants.findIndex(p =>
                  p.id === slot.participant.id
                );

                if (partIndex >= 0) {
                  updatedParticipants[partIndex].isPlaced = false;
                  setParticipants(updatedParticipants);
                }

                slot.participant = null;
                participantRemoved = true;
                break outerLoop;
              }
            }
          }
        }

        if (participantRemoved) {
          setWinnersBracket(updatedWinnersBracket);
        }
      }

      return;
    }

    // If a participant is selected, place them in the slot
    if (isThirdPlace) {
      const updatedThirdPlaceMatch = { ...thirdPlaceMatch };
      let participantPlaced = false;

      for (let s = 0; s < updatedThirdPlaceMatch.slots.length; s++) {
        const slot = updatedThirdPlaceMatch.slots[s];

        if (slot.id === slotId) {
          slot.participant = selectedParticipant;
          participantPlaced = true;
          break;
        }
      }

      if (participantPlaced) {
        setThirdPlaceMatch(updatedThirdPlaceMatch);

        const updatedParticipants = [...participants];
        const partIndex = updatedParticipants.findIndex(p =>
          p.id === selectedParticipant.id
        );

        if (partIndex >= 0) {
          updatedParticipants[partIndex].isPlaced = true;
          setParticipants(updatedParticipants);
        }

        setSelectedParticipant(null);
      }
    } else {
      const updatedWinnersBracket = [...winnersBracket];
      let participantPlaced = false;

      outerLoop: for (let r = 0; r < updatedWinnersBracket.length; r++) {
        for (let m = 0; m < updatedWinnersBracket[r].matches.length; m++) {
          for (let s = 0; s < updatedWinnersBracket[r].matches[m].slots.length; s++) {
            const slot = updatedWinnersBracket[r].matches[m].slots[s];

            if (slot.id === slotId) {
              slot.participant = selectedParticipant;
              participantPlaced = true;
              break outerLoop;
            }
          }
        }
      }

      if (participantPlaced) {
        setWinnersBracket(updatedWinnersBracket);

        const updatedParticipants = [...participants];
        const partIndex = updatedParticipants.findIndex(p =>
          p.id === selectedParticipant.id
        );

        if (partIndex >= 0) {
          updatedParticipants[partIndex].isPlaced = true;
          setParticipants(updatedParticipants);
        }

        setSelectedParticipant(null);
      }
    }
  };

  const getNextWinnersMatch = (currentRound, currentPosition) => {
    const nextRound = currentRound + 1;

    if (nextRound >= winnersBracket.length) {
      return null;
    }

    const nextPosition = Math.floor(currentPosition / 2);
    const isFirstSlot = currentPosition % 2 === 0;

    if (nextPosition >= winnersBracket[nextRound].matches.length) {
      return null;
    }

    return {
      round: nextRound,
      position: nextPosition,
      slotIndex: isFirstSlot ? 0 : 1
    };
  };

  const handleWinnersAdvance = (match, participant, isLoser = false) => {
    if (!participant) return;

    let matchRound = -1;
    let matchPosition = -1;

    for (let r = 0; r < winnersBracket.length; r++) {
      const matchIndex = winnersBracket[r].matches.findIndex(m => m.id === match.id);
      if (matchIndex !== -1) {
        matchRound = r;
        matchPosition = matchIndex;
        break;
      }
    }

    if (matchRound === -1) return;

    // Handle the winner advancing to the next round
    if (!isLoser) {
      const nextMatch = getNextWinnersMatch(matchRound, matchPosition);

      if (nextMatch) {
        const updatedWinnersBracket = [...winnersBracket];
        updatedWinnersBracket[nextMatch.round].matches[nextMatch.position].slots[nextMatch.slotIndex].participant = participant;
        setWinnersBracket(updatedWinnersBracket);
      }
    } else {
      // If this is a semi-final match (round == winnersBracket.length - 2)
      // and isLoser is true, we need to put this participant in the third place match
      const isSemiFinal = matchRound === winnersBracket.length - 2;

      if (isSemiFinal && thirdPlaceMatch) {
        const updatedThirdPlaceMatch = { ...thirdPlaceMatch };
        const updatedSemiFinalsLosers = [...semiFinalsLosers];

        // Add the loser to the semi-finals losers
        const loserIndex = updatedSemiFinalsLosers.findIndex(l => l.id === participant.id);
        if (loserIndex === -1) {
          updatedSemiFinalsLosers.push(participant);
        }

        // If we have 2 semi-finals losers, place them in the third place match
        if (updatedSemiFinalsLosers.length <= 2) {
          const slotIndex = updatedSemiFinalsLosers.length - 1;
          if (slotIndex >= 0 && slotIndex < updatedThirdPlaceMatch.slots.length) {
            updatedThirdPlaceMatch.slots[slotIndex].participant = participant;
          }
        }

        setSemiFinalsLosers(updatedSemiFinalsLosers);
        setThirdPlaceMatch(updatedThirdPlaceMatch);
      }
    }
  };

  const handleThirdPlaceResult = (winnerIndex, isWalkover = false) => {
    if (!thirdPlaceMatch) return;

    // For walkover, we only need one participant
    if (isWalkover) {
      // Find the slot that has a participant
      const filledSlotIndex = thirdPlaceMatch.slots[0].participant ? 0 : 1;
      if (thirdPlaceMatch.slots[filledSlotIndex].participant) {
        const winner = thirdPlaceMatch.slots[filledSlotIndex].participant;
        setThirdPlace(winner);

        // Trigger save to persist the third place winner
        const event = new CustomEvent('saveSingleEliminationBracket');
        document.dispatchEvent(event);
      }
      return;
    }

    // Regular case - both participants exist
    if (!thirdPlaceMatch.slots[0].participant || !thirdPlaceMatch.slots[1].participant) {
      return;
    }

    // Get the winner and loser
    const winner = thirdPlaceMatch.slots[winnerIndex].participant;

    // Set third place winner but preserve both participants in the match
    setThirdPlace(winner);

    // Update the match to ensure both participants stay visible
    const updatedThirdPlaceMatch = { ...thirdPlaceMatch };
    setThirdPlaceMatch(updatedThirdPlaceMatch);

    // Trigger a save to ensure the complete third place match data is persisted
    const event = new CustomEvent('saveSingleEliminationBracket');
    document.dispatchEvent(event);
  };

  const renderSlot = (slot, isThirdPlace = false) => {
    const isHighlighted = selectedParticipant && !slot.participant;

    return (
      <div
        key={slot.id}
        className={`p-2 min-h-[40px] border-b flex items-center justify-between ${isHighlighted ? 'bg-green-100' : slot.participant ? 'bg-gray-50' : 'bg-white'
          } cursor-pointer hover:bg-gray-100`}
        onClick={() => handleSlotClick(slot.id, isThirdPlace)}
      >
        <span className={slot.participant ? 'text-black' : 'text-gray-400'}>
          {slot.participant ? slot.participant.name : 'Empty Slot'}
        </span>
        {slot.participant && (
          <button className="text-red-500 text-sm">×</button>
        )}
      </div>
    );
  };

  const renderThirdPlaceMatch = () => {
    if (!thirdPlaceMatch) return null;

    // Check if third place winner exists by checking the thirdPlace state directly
    const hasWinner = thirdPlace !== null && thirdPlace !== undefined;

    return (
      <div className="border-2 border-purple-400 rounded-md overflow-hidden mb-4">
        <h4 className="bg-purple-100 text-purple-800 font-semibold p-2 text-center">Third Place Match</h4>

        {/* Always show participants in slots, even if there's a winner */}
        {thirdPlaceMatch.slots.map(slot => renderSlot(slot, true))}

        {/* If we have a winner, show the winner message */}
        {hasWinner && (
          <div className="bg-purple-100 p-2 text-center text-purple-800 text-sm font-medium">
            {thirdPlace.name} won third place
          </div>
        )}

        {/* Only show the buttons if we don't have a winner and we're not in view-only mode */}
        {!hasWinner && !viewOnly && (
          <>
            {thirdPlaceMatch.slots[0].participant && thirdPlaceMatch.slots[1].participant && (
              <div className="flex justify-between bg-purple-50 p-2">
                <button
                  onClick={() => handleThirdPlaceResult(0)}
                  className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                >
                  {thirdPlaceMatch.slots[0].participant?.name} won
                </button>
                <button
                  onClick={() => handleThirdPlaceResult(1)}
                  className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                >
                  {thirdPlaceMatch.slots[1].participant?.name} won
                </button>
              </div>
            )}

            {((thirdPlaceMatch.slots[0].participant && !thirdPlaceMatch.slots[1].participant) ||
              (!thirdPlaceMatch.slots[0].participant && thirdPlaceMatch.slots[1].participant)) && (
                <div className="bg-purple-50 p-2 text-center">
                  <button
                    onClick={() => handleThirdPlaceResult(thirdPlaceMatch.slots[0].participant ? 0 : 1, true)}
                    className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                  >
                    {thirdPlaceMatch.slots[0].participant?.name || thirdPlaceMatch.slots[1].participant?.name || 'Player'} wins (walkover)
                  </button>
                </div>
              )}
          </>
        )}
      </div>
    );
  };

  const renderMatch = (match) => {
    let hasAdvanced = false;
    let advancedParticipant = null;
    let matchRound = -1;
    let matchPosition = -1;

    for (let r = 0; r < winnersBracket.length; r++) {
      const matchIndex = winnersBracket[r].matches.findIndex(m => m.id === match.id);
      if (matchIndex !== -1) {
        matchRound = r;
        matchPosition = matchIndex;
        break;
      }
    }

    if (matchRound !== -1) {
      const nextRound = matchRound + 1;

      if (nextRound < winnersBracket.length) {
        const nextMatchPos = Math.floor(matchPosition / 2);
        if (nextMatchPos < winnersBracket[nextRound].matches.length) {
          const nextMatch = winnersBracket[nextRound].matches[nextMatchPos];

          for (const slot of nextMatch.slots) {
            if (slot.participant && match.slots.some(currentSlot =>
              currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {
              hasAdvanced = true;
              advancedParticipant = slot.participant;
              break;
            }
          }
        }
      }
    }

    const isFinal = matchRound === winnersBracket.length - 1;
    const isSemiFinal = matchRound === winnersBracket.length - 2;

    if (isFinal) {
      // Check if a tournament winner has been selected through the actual tournamentWinner prop
      const hasWinner = tournamentWinner !== null && tournamentWinner !== undefined;

      return (
        <div key={match.id} className="border-2 border-yellow-400 rounded-md overflow-hidden mb-4">
          <h4 className="bg-yellow-100 text-yellow-800 font-semibold p-2 text-center">Finals</h4>
          {match.slots.map(slot => renderSlot(slot))}

          {/* Check if a tournament winner has been selected */}
          {hasWinner ? (
            <div className="bg-yellow-100 p-2 text-center text-yellow-800 text-sm font-medium">
              {tournamentWinner.name} won the tournament
            </div>
          ) : (
            !viewOnly && (
              <>
                {match.slots[0].participant && match.slots[1].participant && (
                  <div className="flex justify-between bg-yellow-50 p-2">
                    <button
                      onClick={() => {
                        setTournamentWinner(match.slots[0].participant);
                        setRunnerUp(match.slots[1].participant);
                      }}
                      className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                    >
                      {match.slots[0].participant?.name} won
                    </button>
                    <button
                      onClick={() => {
                        setTournamentWinner(match.slots[1].participant);
                        setRunnerUp(match.slots[0].participant);
                      }}
                      className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                    >
                      {match.slots[1].participant?.name} won
                    </button>
                  </div>
                )}

                {((match.slots[0].participant && !match.slots[1].participant) ||
                  (!match.slots[0].participant && match.slots[1].participant)) && (
                    <div className="bg-yellow-50 p-2 text-center">
                      <button
                        onClick={() => {
                          setTournamentWinner(match.slots[0].participant || match.slots[1].participant);
                          // If there's only one participant, they're also the runner-up
                          setRunnerUp(null);
                        }}
                        className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                      >
                        {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} wins (walkover)
                      </button>
                    </div>
                  )}
              </>
            )
          )}
        </div>
      );
    }

    // Special UI for semi-finals to show advancement to third place match
    if (isSemiFinal) {
      return (
        <div key={match.id} className="border border-blue-200 rounded-md overflow-hidden mb-4">
          {match.slots.map(slot => renderSlot(slot))}

          {!hasAdvanced && !viewOnly && (
            <>
              {match.slots[0].participant && match.slots[1].participant && (
                <div className="flex justify-between bg-blue-50 p-2">
                  <button
                    onClick={() => {
                      handleWinnersAdvance(match, match.slots[0].participant);
                      // Send loser to third place match
                      handleWinnersAdvance(match, match.slots[1].participant, true);
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    {match.slots[0].participant?.name} won
                  </button>
                  <button
                    onClick={() => {
                      handleWinnersAdvance(match, match.slots[1].participant);
                      // Send loser to third place match
                      handleWinnersAdvance(match, match.slots[0].participant, true);
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    {match.slots[1].participant?.name} won
                  </button>
                </div>
              )}

              {((match.slots[0].participant && !match.slots[1].participant) ||
                (!match.slots[0].participant && match.slots[1].participant)) && (
                  <div className="bg-blue-50 p-2 text-center">
                    <button
                      onClick={() => handleWinnersAdvance(match, match.slots[0].participant || match.slots[1].participant)}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      Advance {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} (Bye)
                    </button>
                  </div>
                )}
            </>
          )}

          {hasAdvanced && advancedParticipant && (
            <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
              {advancedParticipant.name} advanced to finals
            </div>
          )}

          {hasAdvanced && !advancedParticipant && (
            <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
              Winner advanced to finals
            </div>
          )}
        </div>
      );
    }

    // Regular matches (not finals or semi-finals)
    return (
      <div key={match.id} className="border border-blue-200 rounded-md overflow-hidden mb-4">
        {match.slots.map(slot => renderSlot(slot))}

        {!hasAdvanced && !viewOnly && (
          <>
            {match.slots[0].participant && match.slots[1].participant && (
              <div className="flex justify-between bg-blue-50 p-2">
                <button
                  onClick={() => {
                    handleWinnersAdvance(match, match.slots[0].participant);
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {match.slots[0].participant?.name} won
                </button>
                <button
                  onClick={() => {
                    handleWinnersAdvance(match, match.slots[1].participant);
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {match.slots[1].participant?.name} won
                </button>
              </div>
            )}

            {((match.slots[0].participant && !match.slots[1].participant) ||
              (!match.slots[0].participant && match.slots[1].participant)) && (
                <div className="bg-blue-50 p-2 text-center">
                  <                  button
                    onClick={() => handleWinnersAdvance(match, match.slots[0].participant || match.slots[1].participant)}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Advance {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} (Bye)
                  </button>
                </div>
              )}
          </>
        )}

        {hasAdvanced && advancedParticipant && (
          <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
            {advancedParticipant.name} advanced
          </div>
        )}

        {hasAdvanced && !advancedParticipant && (
          <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
            Winner advanced to next round
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold mb-4 text-blue-700">Tournament Bracket</h3>
        <div className="flex space-x-6 overflow-x-auto pb-4">
          {winnersBracket.map((round) => {
            const roundName = round.id === `winners-round-${winnersBracket.length - 1}`
              ? 'Finals'
              : round.name;

            return (
              <div key={round.id} className="flex-none w-64">
                <h4 className="text-center font-semibold mb-4">{roundName}</h4>
                <div className="space-y-4">
                  {round.matches.map(match => renderMatch(match))}
                </div>
              </div>
            );
          })}

          {/* Third Place Match Column */}
          {thirdPlaceMatch && (
            <div className="flex-none w-64">
              <h4 className="text-center font-semibold mb-4">Third Place</h4>
              <div className="space-y-4">
                {renderThirdPlaceMatch()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SingleEliminationBracket;