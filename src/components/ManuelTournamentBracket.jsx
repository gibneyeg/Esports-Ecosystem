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
  const [runnerUp, setRunnerUp] = useState(null);
  const [thirdPlace, setThirdPlace] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resetNeeded, setResetNeeded] = useState(false);
  const [tournamentFormat, setTournamentFormat] = useState('SINGLE_ELIMINATION');

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

  const initializeBracket = (participantCount, format = 'SINGLE_ELIMINATION') => {
    const totalWinnersRounds = Math.ceil(Math.log2(participantCount));
    const firstRoundMatches = Math.ceil(participantCount / 2);
    
    const newWinnersBracket = [];
    const winnersMatchesByRound = [];
    
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
    
    if (format === 'SINGLE_ELIMINATION') {
      return {
        winnersBracket: newWinnersBracket,
        losersBracket: [],
        grandFinals: null,
        resetMatch: null
      };
    }
    
    const totalLosersRounds = 2 * totalWinnersRounds - 1;
    const newLosersBracket = [];
    
    for (let r = 0; r < totalLosersRounds; r++) {
      let matchesInRound;
      
      if (r % 2 === 0) {
        const winnersRound = r / 2;
        if (winnersRound < winnersMatchesByRound.length) {
          matchesInRound = winnersMatchesByRound[winnersRound] / 2;
        } else {
          matchesInRound = 1;
        }
      } else {
        const prevRound = r - 1;
        if (prevRound >= 0 && prevRound < newLosersBracket.length) {
          matchesInRound = newLosersBracket[prevRound].matches.length / 2;
        } else {
          matchesInRound = 1;
        }
      }
      
      matchesInRound = Math.max(1, Math.ceil(matchesInRound));
      
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

  useEffect(() => {
    if (isInitialized) return;
    
    let mounted = true;
    
    const initializeTournament = async () => {
      if (!tournament?.participants) return;
      
      setIsLoading(true);
      
      if (tournament.format) {
        setTournamentFormat(tournament.format);
      }
      
      const mappedParticipants = tournament.participants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.username || p.user.email?.split('@')[0] || 'Anonymous',
        participantId: p.id,
        isPlaced: false,
        seedNumber: p.seedNumber || null
      }));
      
      if (mounted) setParticipants(mappedParticipants);
      
      const count = mappedParticipants.length;
      
      const bracketData = await fetchExistingBracket(tournament.id);
      
      if (bracketData && bracketData.matches && bracketData.matches.length > 0) {
        const emptyBracketStructure = initializeBracket(count, tournament.format);
        
        const matchesByBracket = {
          winners: {},
          losers: {},
          finals: {},
          reset: {}
        };
        
        bracketData.matches.forEach(match => {
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
        
        const placedParticipantIds = new Set();
        
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
        
        const updatedGrandFinals = emptyBracketStructure.grandFinals ? { ...emptyBracketStructure.grandFinals } : null;
        if (matchesByBracket.finals && updatedGrandFinals) {
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
        
        const updatedResetMatch = emptyBracketStructure.resetMatch ? { ...emptyBracketStructure.resetMatch } : null;
        if (matchesByBracket.reset && updatedResetMatch) {
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
        
        if (updatedResetMatch && (updatedResetMatch.slots[0].participant || updatedResetMatch.slots[1].participant)) {
          setResetNeeded(true);
        }
        
        if (mounted) {
          setWinnersBracket(updatedWinnersBracket);
          setLosersBracket(updatedLosersBracket);
          if (updatedGrandFinals) setGrandFinals(updatedGrandFinals);
          if (updatedResetMatch) setResetMatch(updatedResetMatch);
        }
        
        const updatedParticipants = mappedParticipants.map(p => ({
          ...p,
          isPlaced: placedParticipantIds.has(p.id)
        }));
        
        if (mounted) setParticipants(updatedParticipants);
        
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
        const { winnersBracket, losersBracket, grandFinals, resetMatch } = initializeBracket(count, tournament.format);
        
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

  const getDropToLosersMatch = (winnersRound, winnersPosition) => {
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

  const getNextLosersMatch = (currentRound, currentPosition) => {
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

  const handleParticipantClick = (participant) => {
    if (viewOnly) return;
    setSelectedParticipant(participant);
  };

  const handleSlotClick = (slotId, bracket) => {
    if (viewOnly) return;
    
    if (!selectedParticipant) {
      let participantRemoved = false;
      
      if (bracket === 'winners') {
        const updatedWinnersBracket = [...winnersBracket];
        
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
    
    let participantPlaced = false;
    
    if (bracket === 'winners') {
      const updatedWinnersBracket = [...winnersBracket];
      
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

  const getNextWinnersMatch = (currentRound, currentPosition) => {
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
    
    if (isLoser && tournamentFormat === 'DOUBLE_ELIMINATION') {
      const loserDest = getDropToLosersMatch(matchRound, matchPosition);
      
      if (loserDest) {
        if (loserDest.type === 'losers') {
          const updatedLosersBracket = JSON.parse(JSON.stringify(losersBracket));
          
          for (let r = 0; r < updatedLosersBracket.length; r++) {
            for (let m = 0; m < updatedLosersBracket[r].matches.length; m++) {
              const currentMatch = updatedLosersBracket[r].matches[m];
              
              if (currentMatch.id === loserDest.match.id) {
                if (!currentMatch.slots[loserDest.slotIndex].participant) {
                  currentMatch.slots[loserDest.slotIndex].participant = participant;
                  setLosersBracket(updatedLosersBracket);
                  return;
                } else {
                  const otherSlot = loserDest.slotIndex === 0 ? 1 : 0;
                  if (!currentMatch.slots[otherSlot].participant) {
                    currentMatch.slots[otherSlot].participant = participant;
                    setLosersBracket(updatedLosersBracket);
                    return;
                  }
                }
              }
            }
          }
          
          const targetRound = loserDest.match.round;
          for (let m = 0; m < updatedLosersBracket[targetRound].matches.length; m++) {
            const currentMatch = updatedLosersBracket[targetRound].matches[m];
            for (let s = 0; s < currentMatch.slots.length; s++) {
              if (!currentMatch.slots[s].participant) {
                currentMatch.slots[s].participant = participant;
                setLosersBracket(updatedLosersBracket);
                return;
              }
            }
          }
        }
      }
    } else {
      const winnerDest = getNextWinnersMatch(matchRound, matchPosition);
      
      if (winnerDest) {
        if (winnerDest.type === 'winners') {
          const updatedWinnersBracket = [...winnersBracket];
          updatedWinnersBracket[winnerDest.match.round].matches[winnerDest.match.position].slots[winnerDest.slotIndex].participant = participant;
          setWinnersBracket(updatedWinnersBracket);
        } else if (winnerDest.type === 'finals' && tournamentFormat === 'DOUBLE_ELIMINATION') {
          const updatedGrandFinals = { ...grandFinals };
          updatedGrandFinals.slots[winnerDest.slotIndex].participant = participant;
          setGrandFinals(updatedGrandFinals);
        }
      }
    }
  };
  
  const handleLosersAdvance = (match, participant, isLoser = false) => {
    if (!participant) return;
    
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
    
    if (matchRound === -1) return;
    
    if (isLoser) {
      // Nothing to do for losers in losers bracket
    } else {
      const winnerDest = getNextLosersMatch(matchRound, matchPosition);
      
      const isLosersFinals = matchRound === losersBracket.length - 1;
      
      if (isLosersFinals) {
        const loser = match.slots.find(s => 
          s.participant && s.participant.id !== participant.id
        )?.participant;
        
        if (loser) {
          setThirdPlace(loser);
        }
      }
      
      if (winnerDest) {
        if (winnerDest.type === 'losers') {
          const updatedLosersBracket = JSON.parse(JSON.stringify(losersBracket));
          
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
          
          targetMatch.slots[winnerDest.slotIndex].participant = participant;
          setLosersBracket(updatedLosersBracket);
        } else if (winnerDest.type === 'finals') {
          const updatedGrandFinals = { ...grandFinals };
          updatedGrandFinals.slots[winnerDest.slotIndex].participant = participant;
          setGrandFinals(updatedGrandFinals);
        }
      }
    }
  };

  const handleGrandFinalsResult = (winnerIndex) => {
    if (!grandFinals.slots[0].participant || !grandFinals.slots[1].participant) {
      return;
    }
    
    const winner = grandFinals.slots[winnerIndex].participant;
    const loser = grandFinals.slots[winnerIndex === 0 ? 1 : 0].participant;
    
    if (winnerIndex === 1) {
      setResetNeeded(true);
      
      const updatedResetMatch = { ...resetMatch };
      updatedResetMatch.slots[0].participant = grandFinals.slots[0].participant;
      updatedResetMatch.slots[1].participant = grandFinals.slots[1].participant;
      setResetMatch(updatedResetMatch);
    } else {
      setTournamentWinner(winner);
      setRunnerUp(loser);
    }
  };
  
  const handleResetMatchResult = (winnerIndex) => {
    if (!resetMatch.slots[0].participant || !resetMatch.slots[1].participant) {
      return;
    }
    
    const winner = resetMatch.slots[winnerIndex].participant;
    const loser = resetMatch.slots[winnerIndex === 0 ? 1 : 0].participant;
    
    setTournamentWinner(winner);
    setRunnerUp(loser);
  };

  const isParticipantPlaced = (participant) => {
    return participant.isPlaced;
  };

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

  const renderWinnersMatch = (match) => {
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
      } else if (matchRound === winnersBracket.length - 1 && tournamentFormat === 'DOUBLE_ELIMINATION') {
        if (grandFinals.slots[0].participant && 
            match.slots.some(slot => 
              slot.participant && slot.participant.id === grandFinals.slots[0].participant.id)) {
          hasAdvanced = true;
          advancedParticipant = grandFinals.slots[0].participant;
        }
      }
    }
    
    const isFinal = matchRound === winnersBracket.length - 1;

    if (isFinal && tournamentFormat === 'SINGLE_ELIMINATION') {
      const finalRoundName = "Finals";
      return (
        <div key={match.id} className="border-2 border-yellow-400 rounded-md overflow-hidden mb-4">
          <h4 className="bg-yellow-100 text-yellow-800 font-semibold p-2 text-center">{finalRoundName}</h4>
          {match.slots.map(slot => renderSlot(slot, 'winners'))}
          
          {!hasAdvanced && !viewOnly && (
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
                    }}
                    className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                  >
                    {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} wins (walkover)
                  </button>
                </div>
              )}
            </>
          )}
          
          {hasAdvanced && (
            <div className="bg-yellow-100 p-2 text-center text-yellow-800 text-sm font-medium">
              {(advancedParticipant ? advancedParticipant.name : 'Winner') + ' advances'}
            </div>
          )}
        </div>
      );
    } else if (isFinal && tournamentFormat === 'DOUBLE_ELIMINATION') {
      return (
        <div key={match.id} className="border-2 border-blue-400 rounded-md overflow-hidden mb-4">
          {match.slots.map(slot => renderSlot(slot, 'winners'))}
          
          {!hasAdvanced && !viewOnly && (
            <>
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
            {match.slots[0].participant && match.slots[1].participant && (
              <div className="flex justify-between bg-blue-50 p-2">
                <button 
                  onClick={() => {
                    handleWinnersAdvance(match, match.slots[0].participant);
                    if (tournamentFormat === 'DOUBLE_ELIMINATION') {
                      handleWinnersAdvance(match, match.slots[1].participant, true);
                    }
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {match.slots[0].participant?.name} won
                </button>
                <button 
                  onClick={() => {
                    handleWinnersAdvance(match, match.slots[1].participant);
                    if (tournamentFormat === 'DOUBLE_ELIMINATION') {
                      handleWinnersAdvance(match, match.slots[0].participant, true);
                    }
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
  
  const renderLosersMatch = (match) => {
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
      const nextLosersRound = matchRound + 1;
      
      if (nextLosersRound < losersBracket.length) {
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
    
    let advancedParticipant = null;
    if (hasAdvanced && match.slots[0].participant && match.slots[1].participant) {
      const nextRound = matchRound + 1;
      
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
      advancedParticipant = match.slots[0].participant || match.slots[1].participant;
    }
    
    return (
      <div key={match.id} className="border border-red-200 rounded-md overflow-hidden mb-4">
        {match.slots.map(slot => renderSlot(slot, 'losers'))}
        
        {!hasAdvanced && !viewOnly && (
          <>
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

  const renderWinnersBracket = () => {
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-blue-700">
          {tournamentFormat === 'DOUBLE_ELIMINATION' ? 'Winners Bracket' : 'Tournament Bracket'}
        </h3>
        <div className="flex space-x-6 overflow-x-auto pb-4">
          {winnersBracket.map((round) => {
            let roundName = round.name;
            if (tournamentFormat === 'SINGLE_ELIMINATION' && 
                round.id === `winners-round-${winnersBracket.length - 1}`) {
              roundName = 'Finals';
            }
            
            return (
              <div key={round.id} className="flex-none w-64">
                <h4 className="text-center font-semibold mb-4">{roundName}</h4>
                <div className="space-y-4">
                {round.matches.map(match => renderWinnersMatch(match))}
                                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
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
          
          {thirdPlace && tournamentFormat === 'DOUBLE_ELIMINATION' && (
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <span className="text-xl mr-2">🥉</span>
                <span>{thirdPlace.name}</span>
              </span>
              <span className="text-yellow-600">${(tournament.prizePool * 0.2).toLocaleString()}</span>
            </div>
          )}

          {tournamentFormat === 'DOUBLE_ELIMINATION' && (
            <div className="mt-2 text-sm text-gray-500">
              <p>In double elimination format, 3rd place is awarded to the loser of the losers bracket finals.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

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

  const saveBracket = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    try {
      const rounds = [];
      
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
            winnerId: null
          };
        });
        
        rounds.push({
          id: roundData.id,
          name: roundData.name,
          matches: matches
        });
      });
      
      if (tournamentFormat === 'DOUBLE_ELIMINATION') {
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
      }
      
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
          const winners = [
            { userId: tournamentWinner.id, position: 1 }
          ];
          
          if (runnerUp) {
            winners.push({ userId: runnerUp.id, position: 2 });
          }
          
          if (thirdPlace && tournamentFormat === 'DOUBLE_ELIMINATION') {
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
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {tournamentFormat === 'DOUBLE_ELIMINATION' 
          ? 'Double Elimination Tournament Bracket' 
          : 'Single Elimination Tournament Bracket'}
      </h2>
      
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
              {tournamentFormat === 'DOUBLE_ELIMINATION' && renderLosersBracket()}
              {tournamentFormat === 'DOUBLE_ELIMINATION' && renderFinals()}
            </div>
          )}
        </div>
      </div>
      
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