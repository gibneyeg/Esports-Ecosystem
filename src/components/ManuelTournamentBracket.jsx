
"use client";


import React, { useState, useEffect, useMemo } from 'react';

const ManualTournamentBracket = ({ tournament, currentUser, isOwner }) => {
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [winnersBracket, setWinnersBracket] = useState([]);
  const [losersBracket, setLosersBracket] = useState([]);
  const [grandFinals, setGrandFinals] = useState(null);
  const [resetMatch, setResetMatch] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [tournamentWinner, setTournamentWinner] = useState(null);
  const [runnerUp, setRunnerUp] = useState(null); // 2nd place
  const [thirdPlace, setThirdPlace] = useState(null); // 3rd place
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resetNeeded, setResetNeeded] = useState(false);

  const viewOnly = useMemo(() => !isOwner, [isOwner]);

  const fetchExistingBracket = async (tournamentId) => {
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

  // Initialize an empty bracket with the correct number of matches per round for double elimination
  const initializeBracket = (participantCount) => {
    // Calculate total rounds for winners bracket
    const totalWinnersRounds = Math.ceil(Math.log2(participantCount));
    const firstRoundMatches = Math.ceil(participantCount / 2);
    
    // Initialize winners bracket
    const newWinnersBracket = [];
    const winnersMatchesByRound = [];
    let totalWinnersMatches = 0;
    
    for (let r = 0; r < totalWinnersRounds; r++) {
      // Calculate matches for this round
      let matchesInRound = Math.ceil(firstRoundMatches / Math.pow(2, r));
      winnersMatchesByRound.push(matchesInRound);
      totalWinnersMatches += matchesInRound;
      
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
              r === totalWinnersRounds - 1 ? 'Winners Finals' : 
              `Winners Round ${r + 1}`,
        matches: matches
      });
    }
    

    const totalLosersRounds = 2 * totalWinnersRounds - 1;
    

    // Initialize losers bracket structure
    const newLosersBracket = [];
    
    // Create every round of the losers bracket
    for (let r = 0; r < totalLosersRounds; r++) {
      let matchesInRound;
      
      if (r % 2 === 0) { // Even rounds (including 0)
        const winnersRound = r / 2;
        if (winnersRound < winnersMatchesByRound.length) {
          matchesInRound = winnersMatchesByRound[winnersRound] / 2;
        } else {
          matchesInRound = 1; // Finals rounds
        }
      } else { // Odd rounds
        // Odd rounds are "consolidation" rounds that don't add new losers
        const prevRound = r - 1;
        if (prevRound >= 0 && prevRound < newLosersBracket.length) {
          matchesInRound = newLosersBracket[prevRound].matches.length / 2;
        } else {
          matchesInRound = 1;
        }
      }
      
      // Ensure we have at least one match per round and handle non-powers of 2
      matchesInRound = Math.max(1, Math.ceil(matchesInRound));
      
      // For the final round, always use 1 match
      if (r === totalLosersRounds - 1) {
        matchesInRound = 1;
      }
      
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
    

    const totalLosersMatches = newLosersBracket.reduce(
      (total, round) => total + round.matches.length, 0
    );

    
    // Create Grand Finals match
    const grandFinalsMatch = {
      id: 'grand-finals',
      round: 0,
      position: 0,
      bracketType: 'finals',
      slots: [
        { id: 'grand-finals-slot-0', participant: null }, // Winners bracket finalist
        { id: 'grand-finals-slot-1', participant: null }  // Losers bracket finalist
      ]
    };
    
    // Create potential reset match (if losers bracket winner wins grand finals)
    const resetMatch = {
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
      resetMatch: resetMatch
    };
  };

  useEffect(() => {
    // Skip if already initialized to prevent re-initialization
    if (isInitialized) return;
    
    let mounted = true;
    
    const initializeTournament = async () => {
      if (!tournament?.participants) return;
      
      console.log("Initializing double elimination tournament bracket...");
      setIsLoading(true);
      
      // Map the participants
      const mappedParticipants = tournament.participants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.username || p.user.email?.split('@')[0] || 'Anonymous',
        participantId: p.id,
        isPlaced: false,
        seedNumber: p.seedNumber || null
      }));
      
      if (mounted) setParticipants(mappedParticipants);
      
      // Initialize bracket based on participant count
      const count = mappedParticipants.length;
      
      // If there are saved brackets, load them
      const bracketData = await fetchExistingBracket(tournament.id);
      
      if (bracketData && bracketData.matches && bracketData.matches.length > 0) {
        console.log("Loading existing bracket data:", bracketData);
        
        // Create initial bracket structure
        const emptyBracketStructure = initializeBracket(count);
        
        // Group matches by bracket type and round
        const matchesByBracket = {
          winners: {},
          losers: {},
          finals: {},
          reset: {}
        };
        
        bracketData.matches.forEach(match => {
          // Determine bracket type from match ID
          let bracketType = 'winners';
          if (match.id && match.id.startsWith('losers-')) {
            bracketType = 'losers';
          } else if (match.id === 'grand-finals') {
            bracketType = 'finals';
          } else if (match.id === 'reset-match') {
            bracketType = 'reset';
          }
          
          if (bracketType === 'winners' || bracketType === 'losers') {
            if (!matchesByBracket[bracketType][match.round]) {
              matchesByBracket[bracketType][match.round] = [];
            }
            matchesByBracket[bracketType][match.round].push(match);
          } else if (bracketType === 'finals') {
            matchesByBracket.finals = match;
          } else if (bracketType === 'reset') {
            matchesByBracket.reset = match;
          }
        });
        
        // Mark which participants are already placed in the bracket
        const placedParticipantIds = new Set();
        
        // Populate winners bracket
        const updatedWinnersBracket = [...emptyBracketStructure.winnersBracket];
        Object.keys(matchesByBracket.winners).forEach(roundIndex => {
          const roundMatches = matchesByBracket.winners[roundIndex];
          
          if (roundIndex < updatedWinnersBracket.length) {
            roundMatches.forEach(match => {
              const matchIndex = match.position;
              
              if (matchIndex < updatedWinnersBracket[roundIndex].matches.length) {
                const currentMatch = updatedWinnersBracket[roundIndex].matches[matchIndex];
                
                if (match.player1) {
                  const participant = mappedParticipants.find(p => p.id === match.player1.id);
                  if (participant) {
                    currentMatch.slots[0].participant = participant;
                    placedParticipantIds.add(participant.id);
                  }
                }
                
                if (match.player2) {
                  const participant = mappedParticipants.find(p => p.id === match.player2.id);
                  if (participant) {
                    currentMatch.slots[1].participant = participant;
                    placedParticipantIds.add(participant.id);
                  }
                }
              }
            });
          }
        });
        
        // Populate losers bracket
        const updatedLosersBracket = [...emptyBracketStructure.losersBracket];
        Object.keys(matchesByBracket.losers).forEach(roundIndex => {
          const roundMatches = matchesByBracket.losers[roundIndex];
          
          if (roundIndex < updatedLosersBracket.length) {
            roundMatches.forEach(match => {
              const matchIndex = match.position;
              
              if (matchIndex < updatedLosersBracket[roundIndex].matches.length) {
                const currentMatch = updatedLosersBracket[roundIndex].matches[matchIndex];
                
                if (match.player1) {
                  const participant = mappedParticipants.find(p => p.id === match.player1.id);
                  if (participant) {
                    currentMatch.slots[0].participant = participant;
                    placedParticipantIds.add(participant.id);
                  }
                }
                
                if (match.player2) {
                  const participant = mappedParticipants.find(p => p.id === match.player2.id);
                  if (participant) {
                    currentMatch.slots[1].participant = participant;
                    placedParticipantIds.add(participant.id);
                  }
                }
              }
            });
          }
        });
        
        // Populate grand finals
        const updatedGrandFinals = { ...emptyBracketStructure.grandFinals };
        if (matchesByBracket.finals) {
          if (matchesByBracket.finals.player1) {
            const participant = mappedParticipants.find(p => p.id === matchesByBracket.finals.player1.id);
            if (participant) {
              updatedGrandFinals.slots[0].participant = participant;
              placedParticipantIds.add(participant.id);
            }
          }
          
          if (matchesByBracket.finals.player2) {
            const participant = mappedParticipants.find(p => p.id === matchesByBracket.finals.player2.id);
            if (participant) {
              updatedGrandFinals.slots[1].participant = participant;
              placedParticipantIds.add(participant.id);
            }
          }
        }
        
        // Populate reset match if needed
        const updatedResetMatch = { ...emptyBracketStructure.resetMatch };
        if (matchesByBracket.reset) {
          if (matchesByBracket.reset.player1) {
            const participant = mappedParticipants.find(p => p.id === matchesByBracket.reset.player1.id);
            if (participant) {
              updatedResetMatch.slots[0].participant = participant;
              placedParticipantIds.add(participant.id);
            }
          }
          
          if (matchesByBracket.reset.player2) {
            const participant = mappedParticipants.find(p => p.id === matchesByBracket.reset.player2.id);
            if (participant) {
              updatedResetMatch.slots[1].participant = participant;
              placedParticipantIds.add(participant.id);
            }
          }
        }
        
        // Check if reset was needed
        if (matchesByBracket.reset && 
            (updatedResetMatch.slots[0].participant || updatedResetMatch.slots[1].participant)) {
          setResetNeeded(true);
        }
        
        // Update bracket states
        if (mounted) {
          setWinnersBracket(updatedWinnersBracket);
          setLosersBracket(updatedLosersBracket);
          setGrandFinals(updatedGrandFinals);
          setResetMatch(updatedResetMatch);
        }
        
        // Update participant placed status
        const updatedParticipants = mappedParticipants.map(p => ({
          ...p,
          isPlaced: placedParticipantIds.has(p.id)
        }));
        
        if (mounted) setParticipants(updatedParticipants);
        
        // Set tournament winners
        if (tournament.winners && tournament.winners.length > 0) {
          const sortedWinners = tournament.winners.sort((a, b) => a.position - b.position);
          
          const firstPlaceWinner = sortedWinners.find(w => w.position === 1);
          if (firstPlaceWinner) {
            const winner = mappedParticipants.find(p => p.id === firstPlaceWinner.user.id);
            if (winner && mounted) {
              setTournamentWinner(winner);
            }
          }
          
          const secondPlaceWinner = sortedWinners.find(w => w.position === 2);
          if (secondPlaceWinner) {
            const runner = mappedParticipants.find(p => p.id === secondPlaceWinner.user.id);
            if (runner && mounted) {
              setRunnerUp(runner);
            }
          }
          
          const thirdPlaceWinner = sortedWinners.find(w => w.position === 3);
          if (thirdPlaceWinner) {
            const third = mappedParticipants.find(p => p.id === thirdPlaceWinner.user.id);
            if (third && mounted) {
              setThirdPlace(third);
            }
          }
        }
      } else {
        const { winnersBracket, losersBracket, grandFinals, resetMatch } = initializeBracket(count);
        
        if (mounted) {
          setWinnersBracket(winnersBracket);
          setLosersBracket(losersBracket);
          setGrandFinals(grandFinals);
          setResetMatch(resetMatch);
        }
      }
      
      if (mounted) {
        setIsInitialized(true);
        setIsLoading(false);
      }
    };
    
    initializeTournament();
    
    return () => {
      mounted = false;
    };
  }, [tournament, isInitialized]);

  // Find the match in losers bracket where a loser from winners bracket should go
  const getDropToLosersMatch = (winnersRound, winnersPosition) => {

    
    // Maps winners round to the corresponding losers round where losers should be placed
    const losersRoundMap = {
      0: 0, // First round losers go to losers round 1
      1: 2, // Second round losers go to losers round 3
      2: 4, // Third round losers go to losers round 5

    };
    
    for (let i = 0; i < winnersBracket.length; i++) {
      losersRoundMap[i] = i * 2;
    }
    
    const targetLosersRound = losersRoundMap[winnersRound];
    
    if (targetLosersRound >= losersBracket.length) {
      return null;
    }
    
    // Calculate appropriate position in the losers bracket
    // This depends on how the losers bracket is structured
    const matchCountInTargetRound = losersBracket[targetLosersRound].matches.length;
    const loserPos = winnersPosition % matchCountInTargetRound;
    
    if (loserPos >= matchCountInTargetRound) {
      return null;
    }
    
    // Check if the target match and slot already has a participant
    const targetMatch = losersBracket[targetLosersRound].matches[loserPos];
    
    // Find the first empty slot in this match
    let slotIndex = -1;
    for (let i = 0; i < targetMatch.slots.length; i++) {
      if (!targetMatch.slots[i].participant) {
        slotIndex = i;
        break;
      }
    }
    
    // If no empty slot was found, try the next available match
    if (slotIndex === -1) {
      // Try to find any match in this round with an empty slot
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
      
      // If we still couldn't find a slot, create a new match if possible
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
      
      return null; // No available slot found
    }
    
    return {
      type: 'losers',
      match: targetMatch,
      slotIndex: slotIndex
    };
  };

  // Find next match in losers bracket
  const getNextLosersMatch = (currentRound, currentPosition) => {
    const nextRound = currentRound + 1;
    
    if (nextRound >= losersBracket.length) {
      return {
        type: 'finals',
        match: grandFinals,
        slotIndex: 1 // Losers finalist goes to second slot in grand finals
      };
    }

    let nextPosition;
    if (currentRound % 2 === 0) {
      nextPosition = Math.floor(currentPosition / 2);
    } else {
      // From odd round to even round - might have a different mapping
      const matchesInCurrentRound = losersBracket[currentRound].matches.length;
      const matchesInNextRound = losersBracket[nextRound].matches.length;
      
      // Map based on total matches in rounds
      if (matchesInCurrentRound === matchesInNextRound) {
        nextPosition = currentPosition;
      } else {
        nextPosition = Math.floor(currentPosition / 2);
      }
    }
    
    // Validate that the calculated position exists
    if (nextPosition >= losersBracket[nextRound].matches.length) {
      // Try to find any match with an empty slot
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
    
    // Determine slot
    // The slot can depend on the structure too
    const isFirstSlot = currentPosition % 2 === 0;
    const targetMatch = losersBracket[nextRound].matches[nextPosition];
    
    // Check if the target slot already has a participant
    const slotIndex = isFirstSlot ? 0 : 1;
    if (!targetMatch.slots[slotIndex].participant) {
      return {
        type: 'losers',
        match: targetMatch,
        slotIndex: slotIndex
      };
    }
    
    // If target slot is occupied, try the other slot
    const otherSlotIndex = slotIndex === 0 ? 1 : 0;
    if (!targetMatch.slots[otherSlotIndex].participant) {
      return {
        type: 'losers',
        match: targetMatch,
        slotIndex: otherSlotIndex
      };
    }
    
    // If both slots are occupied, try to find any match with an empty slot
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

  const handleParticipantClick = (participant) => {
    if (viewOnly) return; // Don't allow changes for non-owners
    setSelectedParticipant(participant);
  };

  const handleSlotClick = (slotId, bracket) => {
    if (viewOnly) return; // Don't allow changes in view-only mode
    
    if (!selectedParticipant) {
      // If no participant is selected, clear the slot if it has a participant
      let participantRemoved = false;
      
      if (bracket === 'winners') {
        const updatedWinnersBracket = [...winnersBracket];
        
        // Check winners bracket for the slot
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
      } else if (bracket === 'losers') {
        const updatedLosersBracket = [...losersBracket];
        
        // Check losers bracket for the slot
        outerLoop: for (let r = 0; r < updatedLosersBracket.length; r++) {
          for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {
            for (let s = 0; s < updatedLosersBracket[r].matches[m].slots.length; s++) {
              const slot = updatedLosersBracket[r].matches[m].slots[s];
              
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
          setLosersBracket(updatedLosersBracket);
        }
      } else if (bracket === 'finals') {
        // Check grand finals for the slot
        const updatedGrandFinals = { ...grandFinals };
        
        for (let s = 0; s < updatedGrandFinals.slots.length; s++) {
          const slot = updatedGrandFinals.slots[s];
          
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
          setGrandFinals(updatedGrandFinals);
        }
      } else if (bracket === 'reset') {
        // Check reset match for the slot
        const updatedResetMatch = { ...resetMatch };
        
        for (let s = 0; s < updatedResetMatch.slots.length; s++) {
          const slot = updatedResetMatch.slots[s];
          
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
          setResetMatch(updatedResetMatch);
        }
      }
      
      return;
    }
    
    // Place the selected participant in the clicked slot
    let participantPlaced = false;
    
    if (bracket === 'winners') {
      const updatedWinnersBracket = [...winnersBracket];
      
      // Place in winners bracket
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
      }
    } else if (bracket === 'losers') {
      const updatedLosersBracket = [...losersBracket];
      
      // Place in losers bracket
      outerLoop: for (let r = 0; r < updatedLosersBracket.length; r++) {
        for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {
          for (let s = 0; s < updatedLosersBracket[r].matches[m].slots.length; s++) {
            const slot = updatedLosersBracket[r].matches[m].slots[s];
            
            if (slot.id === slotId) {
              slot.participant = selectedParticipant;
              participantPlaced = true;
              break outerLoop;
            }
          }
        }
      }
      
      if (participantPlaced) {
        setLosersBracket(updatedLosersBracket);
      }
    } else if (bracket === 'finals') {
      const updatedGrandFinals = { ...grandFinals };
      
      // Place in grand finals
      for (let s = 0; s < updatedGrandFinals.slots.length; s++) {
        const slot = updatedGrandFinals.slots[s];
        
        if (slot.id === slotId) {
          slot.participant = selectedParticipant;
          participantPlaced = true;
          break;
        }
      }
      
      if (participantPlaced) {
        setGrandFinals(updatedGrandFinals);
      }
    } else if (bracket === 'reset') {
      const updatedResetMatch = { ...resetMatch };
      
      // Place in reset match
      for (let s = 0; s < updatedResetMatch.slots.length; s++) {
        const slot = updatedResetMatch.slots[s];
        
        if (slot.id === slotId) {
          slot.participant = selectedParticipant;
          participantPlaced = true;
          break;
        }
      }
      
      if (participantPlaced) {
        setResetMatch(updatedResetMatch);
      }
    }
    
    if (participantPlaced) {
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
  };

  // Find the next match a participant needs to advance to in winners bracket
  const getNextWinnersMatch = (currentRound, currentPosition) => {
    const nextRound = currentRound + 1;
    
    if (nextRound >= winnersBracket.length) {
      // We're advancing to grand finals
      return {
        type: 'finals',
        match: grandFinals,
        slotIndex: 0 // Winners finalist goes to first slot in grand finals
      };
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

  // Handle advancing a participant in winners bracket
  const handleWinnersAdvance = (match, participant, isLoser = false) => {
    if (!participant) return;
    
    // Find the match in the bracket array
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
    
    if (matchRound === -1) return; // Match not found
    
    if (isLoser) {
      // Move loser to losers bracket
      const loserDest = getDropToLosersMatch(matchRound, matchPosition);
      
      if (loserDest) {
        if (loserDest.type === 'losers') {
          // Make a deep copy of the losers bracket to avoid messing up state
          const updatedLosersBracket = JSON.parse(JSON.stringify(losersBracket));
          
          // Find the match by round and position
          for (let r = 0; r < updatedLosersBracket.length; r++) {
            for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {
              const currentMatch = updatedLosersBracket[r].matches[m];
              
              if (currentMatch.id === loserDest.match.id) {
                // Make sure we don't overwrite an existing participant
                if (!currentMatch.slots[loserDest.slotIndex].participant) {
                  currentMatch.slots[loserDest.slotIndex].participant = participant;
                  setLosersBracket(updatedLosersBracket);
                  return; // Exit after placing
                } else {
                  // Try other slot if available
                  const otherSlot = loserDest.slotIndex === 0 ? 1 : 0;
                  if (!currentMatch.slots[otherSlot].participant) {
                    currentMatch.slots[otherSlot].participant = participant;
                    setLosersBracket(updatedLosersBracket);
                    return; // Exit after placing
                  }
                }
              }
            }
          }
          
          // If we're here, we couldn't place the loser in the exact destination
          // Look for any empty slot in that round
          const targetRound = loserDest.match.round;
          for (let m = 0; m < updatedLosersBracket[targetRound].matches.length; m++) {
            const currentMatch = updatedLosersBracket[targetRound].matches[m];
            for (let s = 0; s < currentMatch.slots.length; s++) {
              if (!currentMatch.slots[s].participant) {
                currentMatch.slots[s].participant = participant;
                setLosersBracket(updatedLosersBracket);
                return; // Exit after placing
              }
            }
          }
          
          // If we still couldn't place, log an error
          console.error("Could not place loser in losers bracket - no empty slots found");
        }
      }
    } else {
      // Advance winner
      const winnerDest = getNextWinnersMatch(matchRound, matchPosition);
      
      if (winnerDest) {
        if (winnerDest.type === 'winners') {
          const updatedWinnersBracket = [...winnersBracket];
          updatedWinnersBracket[winnerDest.match.round].matches[winnerDest.match.position].slots[winnerDest.slotIndex].participant = participant;
          setWinnersBracket(updatedWinnersBracket);
        } else if (winnerDest.type === 'finals') {
          const updatedGrandFinals = { ...grandFinals };
          updatedGrandFinals.slots[winnerDest.slotIndex].participant = participant;
          setGrandFinals(updatedGrandFinals);
        }
      }
    }
  };
  
  // Handle advancing a participant in losers bracket
  const handleLosersAdvance = (match, participant, isLoser = false) => {
    if (!participant) return;
    
    // Find the match in the bracket array
    let matchRound = -1;
    let matchPosition = -1;
    
    for (let r = 0; r < losersBracket.length; r++) {
      const matchIndex = losersBracket[r].matches.findIndex(m => m.id === match.id);
      if (matchIndex !== -1) {
        matchRound = r;
        matchPosition = matchIndex;
        break;
      }
    }
    
    if (matchRound === -1) return; // Match not found
    
    if (isLoser) {
      // In losers bracket, losers are eliminated
      // Nothing to do here
    } else {
      // Advance winner
      const winnerDest = getNextLosersMatch(matchRound, matchPosition);
      
      // Check if this is the losers finals (last round of losers bracket)
      const isLosersFinals = matchRound === losersBracket.length - 1;
      
      if (isLosersFinals) {
        // The loser of losers finals gets 3rd place
        const loser = match.slots.find(s => 
          s.participant && s.participant.id !== participant.id
        )?.participant;
        
        if (loser) {
          setThirdPlace(loser);
          console.log(`Set ${loser.name} as 3rd place (loser of losers finals)`);
        }
      }
      
      if (winnerDest) {
        if (winnerDest.type === 'losers') {
          // Create a deep copy to avoid state issues
          const updatedLosersBracket = JSON.parse(JSON.stringify(losersBracket));
          
          // Find the exact match in our copy
          let targetMatch = null;
          let targetRound = -1;
          let targetPosition = -1;
          
          for (let r = 0; r < updatedLosersBracket.length; r++) {
            for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {
              if (updatedLosersBracket[r].matches[m].id === winnerDest.match.id) {
                targetMatch = updatedLosersBracket[r].matches[m];
                targetRound = r;
                targetPosition = m;
                break;
              }
            }
            if (targetMatch) break;
          }
          
          if (!targetMatch) {
            console.error("Target match not found in losers bracket copy");
            return;
          }
          
          // Set the participant in the slot
          targetMatch.slots[winnerDest.slotIndex].participant = participant;
          
          // Update the state
          setLosersBracket(updatedLosersBracket);
          
          // Log advancement for debugging
          console.log(`Advanced ${participant.name} from Losers R${matchRound+1}M${matchPosition+1} to Losers R${targetRound+1}M${targetPosition+1} slot ${winnerDest.slotIndex+1}`);
        } else if (winnerDest.type === 'finals') {
          const updatedGrandFinals = { ...grandFinals };
          updatedGrandFinals.slots[winnerDest.slotIndex].participant = participant;
          setGrandFinals(updatedGrandFinals);
          
          // Log advancement for debugging
          console.log(`Advanced ${participant.name} from Losers R${matchRound+1}M${matchPosition+1} to Grand Finals slot ${winnerDest.slotIndex+1}`);
        }
      } else {
        console.error(`No valid destination found for ${participant.name} from Losers R${matchRound+1}M${matchPosition+1}`);
      }
    }
  };

  // Handle results of grand finals
  const handleGrandFinalsResult = (winnerIndex) => {
    if (!grandFinals.slots[0].participant || !grandFinals.slots[1].participant) {
      return; // Both participants must be set
    }
    
    const winner = grandFinals.slots[winnerIndex].participant;
    const loser = grandFinals.slots[winnerIndex === 0 ? 1 : 0].participant;
    
    if (winnerIndex === 1) {
      // If losers bracket winner wins grand finals, we need a reset match
      setResetNeeded(true);
      
      // Create reset match with same participants
      const updatedResetMatch = { ...resetMatch };
      updatedResetMatch.slots[0].participant = grandFinals.slots[0].participant;
      updatedResetMatch.slots[1].participant = grandFinals.slots[1].participant;
      setResetMatch(updatedResetMatch);
    } else {
      // If winners bracket winner wins grand finals, tournament is over
      setTournamentWinner(winner);
      setRunnerUp(loser);
      
      // Third place should already be set from losers finals
      // If not set for some reason, we don't have a clear way to determine it at this point
      if (!thirdPlace) {
        console.warn("Third place not set - should have been determined in losers finals");
      }
    }
  };
  
  // Handle reset match result
  const handleResetMatchResult = (winnerIndex) => {
    if (!resetMatch.slots[0].participant || !resetMatch.slots[1].participant) {
      return; // Both participants must be set
    }
    
    const winner = resetMatch.slots[winnerIndex].participant;
    const loser = resetMatch.slots[winnerIndex === 0 ? 1 : 0].participant;
    
    setTournamentWinner(winner);
    setRunnerUp(loser);
    
    // Third place should already be set from losers finals
    // If not set for some reason, we don't have a clear way to determine it at this point
    if (!thirdPlace) {
      console.warn("Third place not set - should have been determined in losers finals");
    }
  };

  // Check if a participant is already placed
  const isParticipantPlaced = (participant) => {
    return participant.isPlaced;
  };

  // Render a participant in the sidebar
  const renderParticipant = (participant) => {
    const isPlaced = isParticipantPlaced(participant);
    const isSelected = selectedParticipant && selectedParticipant.id === participant.id;
    
    return (
      <div
        key={participant.id}
        className={`p-2 mb-2 border rounded ${
          isPlaced ? 'bg-gray-200 text-gray-600' :
          isSelected ? 'bg-blue-200 border-blue-600 border-2' : 'bg-blue-50 hover:bg-blue-100'
        } cursor-pointer`}
        onClick={() => !isPlaced && handleParticipantClick(participant)}
      >
        {participant.seedNumber && (
          <span className="inline-block w-5 h-5 bg-gray-100 text-xs text-center rounded-full mr-1">
            {participant.seedNumber}
          </span>
        )}
        {participant.name}
        {isSelected && " ✓"}
      </div>
    );
  };

  // Render a bracket slot
  const renderSlot = (slot, bracket) => {
    const isHighlighted = selectedParticipant && !slot.participant;
    
    return (
      <div
        key={slot.id}
        className={`p-2 min-h-[40px] border-b flex items-center justify-between ${
          isHighlighted ? 'bg-green-100' : slot.participant ? 'bg-gray-50' : 'bg-white'
        } cursor-pointer hover:bg-gray-100`}
        onClick={() => handleSlotClick(slot.id, bracket)}
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

  // Render a match in winners bracket
  const renderWinnersMatch = (match) => {
    // Find next match in bracket to check if this participant has advanced
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
      // Check the next round (or grand finals) to see if any participant from this match has advanced
      const nextRound = matchRound + 1;
      
      if (nextRound < winnersBracket.length) {
        // Check next winners round
        const nextMatchPos = Math.floor(matchPosition / 2);
        if (nextMatchPos < winnersBracket[nextRound].matches.length) {
          const nextMatch = winnersBracket[nextRound].matches[nextMatchPos];
          
          // Check if any participant from this match is in next match
          for (const slot of nextMatch.slots) {
            if (slot.participant && match.slots.some(currentSlot => 
                currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {
              hasAdvanced = true;
              advancedParticipant = slot.participant;
              break;
            }
          }
        }
      } else if (matchRound === winnersBracket.length - 1) {
        // Check grand finals for winners bracket finalist
        if (grandFinals.slots[0].participant && 
            match.slots.some(slot => 
              slot.participant && slot.participant.id === grandFinals.slots[0].participant.id)) {
          hasAdvanced = true;
          advancedParticipant = grandFinals.slots[0].participant;
        }
      }
    }
    
    const isFinal = matchRound === winnersBracket.length - 1;
    
    // Special case for final match of winners bracket
    if (isFinal) {
      return (
        <div key={match.id} className="border-2 border-blue-400 rounded-md overflow-hidden mb-4">
          {match.slots.map(slot => renderSlot(slot, 'winners'))}
          
          {!hasAdvanced && !viewOnly && (
            <>
              {/* Only show advance buttons if both slots have participants */}
              {match.slots[0].participant && match.slots[1].participant && (
                <div className="flex justify-between bg-blue-50 p-2">
                  <button 
                    onClick={() => {
                      handleWinnersAdvance(match, match.slots[0].participant);
                      handleWinnersAdvance(match, match.slots[1].participant, true);
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    {match.slots[0].participant?.name} won
                  </button>
                  <button 
                    onClick={() => {
                      handleWinnersAdvance(match, match.slots[1].participant);
                      handleWinnersAdvance(match, match.slots[0].participant, true);
                    }}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    {match.slots[1].participant?.name} won
                  </button>
                </div>
              )}
              
              {/* For matches with only one participant (bye), show just one advance button */}
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
          
          {/* Show who advanced */}
          {hasAdvanced && advancedParticipant && (
            <div className="bg-blue-100 p-2 text-center text-blue-800 text-sm font-medium">
              {advancedParticipant.name} advanced to grand finals
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div key={match.id} className="border border-blue-200 rounded-md overflow-hidden mb-4">
        {match.slots.map(slot => renderSlot(slot, 'winners'))}
        
        {!hasAdvanced && !viewOnly && (
          <>
            {/* Only show advance buttons if both slots have participants */}
            {match.slots[0].participant && match.slots[1].participant && (
              <div className="flex justify-between bg-blue-50 p-2">
                <button 
                  onClick={() => {
                    handleWinnersAdvance(match, match.slots[0].participant);
                    handleWinnersAdvance(match, match.slots[1].participant, true);
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {match.slots[0].participant?.name} won
                </button>
                <button 
                  onClick={() => {
                    handleWinnersAdvance(match, match.slots[1].participant);
                    handleWinnersAdvance(match, match.slots[0].participant, true);
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {match.slots[1].participant?.name} won
                </button>
              </div>
            )}
            
            {/* For matches with only one participant (bye), show just one advance button */}
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
        
        {/* Show who advanced */}
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
  
  // Render a match in losers bracket
  const renderLosersMatch = (match) => {
    // Find if this match's winner has advanced to the next round
    let hasAdvanced = false;
    let matchRound = -1;
    let matchPosition = -1;
    
    for (let r = 0; r < losersBracket.length; r++) {
      const matchIndex = losersBracket[r].matches.findIndex(m => m.id === match.id);
      if (matchIndex !== -1) {
        matchRound = r;
        matchPosition = matchIndex;
        break;
      }
    }
    
    if (matchRound !== -1) {
      // Check all possible next matches to see if either participant has advanced
      const nextLosersRound = matchRound + 1;
      
      if (nextLosersRound < losersBracket.length) {
        // Check if any participant from this match is in the next round
        for (const nextMatch of losersBracket[nextLosersRound].matches) {
          for (const slot of nextMatch.slots) {
            if (slot.participant && 
                match.slots.some(currentSlot => 
                  currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {
              hasAdvanced = true;
              break;
            }
          }
          if (hasAdvanced) break;
        }
      }
      
      // Also check grand finals if no advancement found and we're in the final losers round
      if (!hasAdvanced && matchRound === losersBracket.length - 1) {
        for (const slot of grandFinals.slots) {
          if (slot.participant && 
              match.slots.some(currentSlot => 
                currentSlot.participant && currentSlot.participant.id === slot.participant.id)) {
            hasAdvanced = true;
            break;
          }
        }
      }
    }
    
    // Find which participant has advanced (if any)
    let advancedParticipant = null;
    if (hasAdvanced && match.slots[0].participant && match.slots[1].participant) {
      const nextRound = matchRound + 1;
      
      // Check next losers round
      if (nextRound < losersBracket.length) {
        for (const nextMatch of losersBracket[nextRound].matches) {
          for (const slot of nextMatch.slots) {
            if (slot.participant) {
              if (slot.participant.id === match.slots[0].participant.id) {
                advancedParticipant = match.slots[0].participant;
                break;
              } else if (slot.participant.id === match.slots[1].participant.id) {
                advancedParticipant = match.slots[1].participant;
                break;
              }
            }
          }
          if (advancedParticipant) break;
        }
      }
      
      // Check grand finals if needed
      if (!advancedParticipant && matchRound === losersBracket.length - 1) {
        for (const slot of grandFinals.slots) {
          if (slot.participant) {
            if (slot.participant.id === match.slots[0].participant.id) {
              advancedParticipant = match.slots[0].participant;
              break;
            } else if (slot.participant.id === match.slots[1].participant.id) {
              advancedParticipant = match.slots[1].participant;
              break;
            }
          }
        }
      }
    } else if (hasAdvanced) {
      // If only one participant, they must be the one who advanced
      advancedParticipant = match.slots[0].participant || match.slots[1].participant;
    }
    
    return (
      <div key={match.id} className="border border-red-200 rounded-md overflow-hidden mb-4">
        {match.slots.map(slot => renderSlot(slot, 'losers'))}
        
        {!hasAdvanced && !viewOnly && (
          <>
            {/* Only show advance buttons if both slots have participants */}
            {match.slots[0].participant && match.slots[1].participant && (
              <div className="flex justify-between bg-red-50 p-2">
                <button 
                  onClick={() => {
                    handleLosersAdvance(match, match.slots[0].participant);
                  }}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  {match.slots[0].participant?.name} won
                </button>
                <button 
                  onClick={() => {
                    handleLosersAdvance(match, match.slots[1].participant);
                  }}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  {match.slots[1].participant?.name} won
                </button>
              </div>
            )}
            
            {/* For matches with only one participant (bye), show just one advance button */}
            {((match.slots[0].participant && !match.slots[1].participant) || 
              (!match.slots[0].participant && match.slots[1].participant)) && (
              <div className="bg-red-50 p-2 text-center">
                <button 
                  onClick={() => handleLosersAdvance(match, match.slots[0].participant || match.slots[1].participant)}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Advance {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} (Bye)
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Show who advanced */}
        {hasAdvanced && advancedParticipant && (
          <div className="bg-red-100 p-2 text-center text-red-800 text-sm font-medium">
            {advancedParticipant.name} advanced
          </div>
        )}
        
        {hasAdvanced && !advancedParticipant && (
          <div className="bg-red-100 p-2 text-center text-red-800 text-sm font-medium">
            Winner advanced to next round
          </div>
        )}
      </div>
    );
  };
  
  // Render grand finals match
  const renderGrandFinals = () => {
    const bothParticipantsPresent = grandFinals.slots[0].participant && grandFinals.slots[1].participant;
    const hasWinner = tournamentWinner && bothParticipantsPresent;
    
    return (
      <div key="grand-finals" className="border-2 border-yellow-400 rounded-md overflow-hidden mb-4">
        <h4 className="bg-yellow-100 text-yellow-800 font-semibold p-2 text-center">Grand Finals</h4>
        {grandFinals.slots.map(slot => renderSlot(slot, 'finals'))}
        
        {bothParticipantsPresent && !tournamentWinner && !resetNeeded && !viewOnly && (
          <div className="flex justify-between bg-yellow-100 p-2">
            <button 
              onClick={() => handleGrandFinalsResult(0)}
              className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
            >
              {grandFinals.slots[0].participant.name} won
            </button>
            <button 
              onClick={() => handleGrandFinalsResult(1)}
              className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
            >
              {grandFinals.slots[1].participant.name} won (force reset)
            </button>
          </div>
        )}
        
        {resetNeeded && !tournamentWinner && (
          <div className="bg-orange-100 p-2 text-center text-orange-800 text-sm font-bold">
            Reset match required!
          </div>
        )}
        
        {hasWinner && (
          <div className="bg-yellow-100 p-2 text-center text-yellow-800 text-sm font-bold">
            {tournamentWinner.name} won!
          </div>
        )}
      </div>
    );
  };
  
  // Render reset match
  const renderResetMatch = () => {
    if (!resetNeeded) {
      return null;
    }
    
    const bothParticipantsPresent = resetMatch.slots[0].participant && resetMatch.slots[1].participant;
    
    return (
      <div key="reset-match" className="border-2 border-red-400 rounded-md overflow-hidden mb-4">
        <h4 className="bg-red-100 text-red-800 font-semibold p-2 text-center">Reset Match (Final)</h4>
        {resetMatch.slots.map(slot => renderSlot(slot, 'reset'))}
        
        {bothParticipantsPresent && !tournamentWinner && !viewOnly && (
          <div className="flex justify-between bg-red-100 p-2">
            <button 
              onClick={() => handleResetMatchResult(0)}
              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
            >
              {resetMatch.slots[0].participant.name} won
            </button>
            <button 
              onClick={() => handleResetMatchResult(1)}
              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
            >
              {resetMatch.slots[1].participant.name} won
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render a bracket section
  const renderWinnersBracket = () => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-blue-700">Winners Bracket</h3>
        <div className="flex space-x-6 overflow-x-auto pb-4">
          {winnersBracket.map((round) => (
            <div key={round.id} className="flex-none w-64">
              <h4 className="text-center font-semibold mb-4">{round.name}</h4>
              <div className="space-y-4">
                {round.matches.map(match => renderWinnersMatch(match))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render losers bracket
  const renderLosersBracket = () => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-red-700">Losers Bracket</h3>
        <div className="flex space-x-6 overflow-x-auto pb-4">
          {losersBracket.map((round) => (
            <div key={round.id} className="flex-none w-64">
              <h4 className="text-center font-semibold mb-4">{round.name}</h4>
              <div className="space-y-4">
                {round.matches.map(match => renderLosersMatch(match))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render finals section
  const renderFinals = () => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-yellow-700">Finals</h3>
        <div className="w-64 mx-auto">
          {renderGrandFinals()}
          {resetNeeded && renderResetMatch()}
        </div>
      </div>
    );
  };

  // Render winner display and placements
  const renderWinnerDisplay = () => {
    if (!tournamentWinner) return null;
    
    return (
      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-xl font-bold text-yellow-800 mb-4">Tournament Results</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <span className="text-2xl mr-2">🥇</span>
              <span className="font-semibold">{tournamentWinner.name}</span>
            </span>
            <span className="text-yellow-600 font-medium">${(tournament.prizePool * 0.5).toLocaleString()}</span>
          </div>
          
          {runnerUp && (
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <span className="text-xl mr-2">🥈</span>
                <span>{runnerUp.name}</span>
              </span>
              <span className="text-yellow-600">${(tournament.prizePool * 0.3).toLocaleString()}</span>
            </div>
          )}
          
          {thirdPlace && (
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <span className="text-xl mr-2">🥉</span>
                <span>{thirdPlace.name}</span>
              </span>
              <span className="text-yellow-600">${(tournament.prizePool * 0.2).toLocaleString()}</span>
            </div>
          )}

          <div className="mt-2 text-sm text-gray-500">
            <p>In double elimination format, 3rd place is awarded to the loser of the losers bracket finals.</p>
          </div>
        </div>
      </div>
    );
  };

  // Render loading skeleton
  const renderBracketSkeleton = () => {
    return (
      <div>
        <div className="h-6 bg-gray-200 rounded w-48 mb-6 mx-auto"></div>
        <div className="flex space-x-6 pb-4">
          {[1, 2, 3].map((roundIdx) => (
            <div key={roundIdx} className="flex-none w-64">
              <div className="h-6 bg-gray-200 rounded w-24 mx-auto mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((matchIdx) => (
                  <div key={`${roundIdx}-${matchIdx}`} className="border rounded-md overflow-hidden mb-4">
                    <div className="p-2 min-h-[40px] border-b bg-gray-100 animate-pulse"></div>
                    <div className="p-2 min-h-[40px] border-b bg-gray-100 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

// Save tournament bracket data
// Save tournament bracket data
const saveBracket = async () => {
  setSaving(true);
  setSaveMessage(null);
  
  try {
    // Initialize rounds array - the backend expects this format
    const rounds = [];
    
    // Process winners bracket
    winnersBracket.forEach((roundData, roundIndex) => {
      const matches = roundData.matches.map((match, matchIndex) => {
        return {
          id: match.id,
          position: matchIndex,
          player1: match.slots[0].participant ? {
            id: match.slots[0].participant.id,
            participantId: match.slots[0].participant.participantId
          } : null,
          player2: match.slots[1].participant ? {
            id: match.slots[1].participant.id,
            participantId: match.slots[1].participant.participantId
          } : null,
          winnerId: null // We track winners separately
        };
      });
      
      rounds.push({
        id: roundData.id,
        name: roundData.name,
        matches: matches
      });
    });
    
    // Process losers bracket - add as additional rounds
    losersBracket.forEach((roundData, roundIndex) => {
      const matches = roundData.matches.map((match, matchIndex) => {
        return {
          id: match.id,
          position: matchIndex,
          player1: match.slots[0].participant ? {
            id: match.slots[0].participant.id,
            participantId: match.slots[0].participant.participantId
          } : null,
          player2: match.slots[1].participant ? {
            id: match.slots[1].participant.id,
            participantId: match.slots[1].participant.participantId
          } : null,
          winnerId: null
        };
      });
      
      rounds.push({
        id: roundData.id,
        name: roundData.name,
        matches: matches
      });
    });
    
    // Add grand finals as a separate round
    if (grandFinals) {
      rounds.push({
        id: "grand-finals-round",
        name: "Grand Finals",
        matches: [{
          id: "grand-finals",
          position: 0,
          player1: grandFinals.slots[0].participant ? {
            id: grandFinals.slots[0].participant.id,
            participantId: grandFinals.slots[0].participant.participantId
          } : null,
          player2: grandFinals.slots[1].participant ? {
            id: grandFinals.slots[1].participant.id,
            participantId: grandFinals.slots[1].participant.participantId
          } : null,
          winnerId: null
        }]
      });
    }
    
    // Add reset match if needed
    if (resetNeeded && resetMatch) {
      rounds.push({
        id: "reset-match-round",
        name: "Reset Match",
        matches: [{
          id: "reset-match",
          position: 0,
          player1: resetMatch.slots[0].participant ? {
            id: resetMatch.slots[0].participant.id,
            participantId: resetMatch.slots[0].participant.participantId
          } : null,
          player2: resetMatch.slots[1].participant ? {
            id: resetMatch.slots[1].participant.id,
            participantId: resetMatch.slots[1].participant.participantId
          } : null,
          winnerId: null
        }]
      });
    }
    
    // Format data for API
    const bracketData = {
      rounds: rounds,
      tournamentWinnerId: tournamentWinner ? tournamentWinner.id : null
    };
    
    const response = await fetch(`/api/tournaments/${tournament.id}/bracket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bracketData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save bracket');
    }
    
    let winnersSaved = false;
    if (tournamentWinner) {
      try {
        // Prepare the winners array
        const winners = [
          { userId: tournamentWinner.id, position: 1 }
        ];
        
        // Add 2nd place 
        if (runnerUp) {
          winners.push({ userId: runnerUp.id, position: 2 });
        }
        
        // Add 3rd place 
        if (thirdPlace) {
          winners.push({ userId: thirdPlace.id, position: 3 });
        }
        
        const winnerResponse = await fetch(`/api/tournaments/${tournament.id}/winner`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ winners }),
        });
        
        if (winnerResponse.ok) {
          winnersSaved = true;
        }
      } catch (error) {
        console.error("Error saving tournament winners:", error);
      }
    }
    
    setSaveMessage({ 
      type: 'success', 
      text: winnersSaved 
        ? 'Bracket and winners saved successfully!' 
        : 'Bracket saved successfully!'
    });
  } catch (error) {
    console.error('Error saving bracket:', error);
    setSaveMessage({ type: 'error', text: error.message });
  } finally {
    setSaving(false);
  }
};



  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Double Elimination Tournament Bracket</h2>
      
      {/* Winner display at the top when there's a champion */}
      {tournamentWinner && renderWinnerDisplay()}
      
      <div className="flex flex-col md:flex-row gap-6">
        {!viewOnly && (
          <div className="md:w-1/4">
            <h3 className="font-semibold mb-2">Participants</h3>
            <p className="text-sm text-gray-500 mb-2">
              Click a participant, then click a bracket slot to place them.
            </p>
            <div className="border rounded p-3 bg-gray-50 max-h-[600px] overflow-y-auto">
              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No participants found</p>
              ) : (
                participants.map(participant => renderParticipant(participant))
              )}
            </div>
          </div>
        )}
        
        <div className={`${viewOnly ? 'w-full' : 'md:w-3/4'} overflow-x-auto`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              {renderBracketSkeleton()}
            </div>
          ) : (
            <div className="space-y-8">
              {renderWinnersBracket()}
              {renderLosersBracket()}
              {renderFinals()}
            </div>
          )}
        </div>
      </div>
      
      {/* Save Button and Message */}
      {!viewOnly && (
        <div className="mt-6">
          <button 
            onClick={saveBracket} 
            disabled={saving || isLoading}
            className={`px-4 py-2 rounded-md text-white font-medium ${(saving || isLoading) ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {saving ? 'Saving...' : 'Save Bracket'}
          </button>
          
          {saveMessage && (
            <div className={`mt-2 px-4 py-2 rounded ${saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {saveMessage.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default ManualTournamentBracket;