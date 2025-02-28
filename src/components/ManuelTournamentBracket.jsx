"use client";

import React, { useState, useEffect, useMemo } from 'react';

const ManualTournamentBracket = ({ tournament, currentUser, isOwner }) => {
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [tournamentWinner, setTournamentWinner] = useState(null);
  const [runnerUp, setRunnerUp] = useState(null); // 2nd place
  const [thirdPlace, setThirdPlace] = useState(null); // 3rd place
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Initialize an empty bracket with the correct number of matches per round
  const initializeBracket = (firstRoundMatches, totalRounds) => {
    const newRounds = [];
    
    for (let r = 0; r < totalRounds; r++) {
      // Calculate matches for this round
      let matchesInRound = Math.ceil(firstRoundMatches / Math.pow(2, r));
      
      const matches = [];
      
      for (let m = 0; m < matchesInRound; m++) {
        matches.push({
          id: `match-${r}-${m}`,
          slots: [
            { id: `slot-${r}-${m}-0`, participant: null },
            { id: `slot-${r}-${m}-1`, participant: null }
          ]
        });
      }
      
      newRounds.push({
        id: `round-${r}`,
        name: r === 0 ? 'Round 1' : r === totalRounds - 1 ? 'Final' : totalRounds > 2 && r === totalRounds - 2 ? 'Semi-Finals' : `Round ${r + 1}`,
        matches: matches
      });
    }
    
    return newRounds;
  };

  useEffect(() => {
    // Skip if already initialized to prevent re-initialization
    if (isInitialized) return;
    
    let mounted = true;
    
    const initializeTournament = async () => {
      if (!tournament?.participants) return;
      
      console.log("Initializing tournament bracket...");
      setIsLoading(true);
      
      // Map the participants
      const mappedParticipants = tournament.participants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.username || p.user.email?.split('@')[0] || 'Anonymous',
        participantId: p.id,
        isPlaced: false
      }));
      
      if (mounted) setParticipants(mappedParticipants);
      
      // Determine bracket size based on participant count
      const count = mappedParticipants.length;
      const firstRoundMatches = Math.ceil(count / 2);
      const totalRounds = Math.ceil(Math.log2(count));
      
      console.log(`Participants: ${count}, First round matches: ${firstRoundMatches}, Total rounds: ${totalRounds}`);
      
      const bracketData = await fetchExistingBracket(tournament.id);
      
      if (bracketData && bracketData.matches && bracketData.matches.length > 0) {
        console.log("Loading existing bracket data:", bracketData);
        
        // Create initial bracket structure
        const emptyBracketStructure = initializeBracket(firstRoundMatches, totalRounds);
        
        const matchesByRound = {};
        bracketData.matches.forEach(match => {
          if (!matchesByRound[match.round]) {
            matchesByRound[match.round] = [];
          }
          matchesByRound[match.round].push(match);
        });
        
        // Mark which participants are already placed in the bracket
        const placedParticipantIds = new Set();
        
        Object.keys(matchesByRound).forEach(roundIndex => {
          const roundMatches = matchesByRound[roundIndex];
          
          if (roundIndex < emptyBracketStructure.length) {
            roundMatches.forEach(match => {
              const matchIndex = match.position;
              
              if (matchIndex < emptyBracketStructure[roundIndex].matches.length) {
                const currentMatch = emptyBracketStructure[roundIndex].matches[matchIndex];
                
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
        
        // Update the rounds state
        if (mounted) setRounds(emptyBracketStructure);
        
        const updatedParticipants = mappedParticipants.map(p => ({
          ...p,
          isPlaced: placedParticipantIds.has(p.id)
        }));
        
        if (mounted) setParticipants(updatedParticipants);
        
        if (bracketData.winner) {
          const winner = mappedParticipants.find(p => p.id === bracketData.winner.id);
          if (winner && mounted) {
            setTournamentWinner(winner);
          }
        }

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
        console.log("No existing bracket data, creating empty bracket");
        if (mounted) setRounds(initializeBracket(firstRoundMatches, totalRounds));
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

  const findAdvancedParticipant = (match) => {
    let matchRound = -1;
    let matchPosition = -1;
    
    for (let r = 0; r < rounds.length; r++) {
      const matchIndex = rounds[r].matches.findIndex(m => m.id === match.id);
      if (matchIndex !== -1) {
        matchRound = r;
        matchPosition = matchIndex;
        break;
      }
    }
    
    if (matchRound === -1 || matchRound === rounds.length - 1) return null;
    
    const nextRound = matchRound + 1;
    const nextPosition = Math.floor(matchPosition / 2);
    const isFirstSlot = matchPosition % 2 === 0;
    
    if (nextRound >= rounds.length) return null;
    if (nextPosition >= rounds[nextRound].matches.length) return null;
    
    const nextMatch = rounds[nextRound].matches[nextPosition];
    const slotIndex = isFirstSlot ? 0 : 1;
    
    const advancedParticipant = nextMatch.slots[slotIndex].participant;
    if (!advancedParticipant) return null;
    
    if (match.slots[0].participant && match.slots[0].participant.id === advancedParticipant.id) {
      return match.slots[0].participant;
    }
    
    if (match.slots[1].participant && match.slots[1].participant.id === advancedParticipant.id) {
      return match.slots[1].participant;
    }
    
    return null;
  };

  const handleParticipantClick = (participant) => {
    if (viewOnly) return; // Don't allow changes for non-owners
    setSelectedParticipant(participant);
  };

  const handleSlotClick = (slotId) => {
    if (!selectedParticipant) {
      const updatedRounds = [...rounds];
      let participantRemoved = false;
      
      for (let r = 0; r < updatedRounds.length; r++) {
        for (let m = 0; m < updatedRounds[r].matches.length; m++) {
          for (let s = 0; s < updatedRounds[r].matches[m].slots.length; s++) {
            const slot = updatedRounds[r].matches[m].slots[s];
            
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
          if (participantRemoved) break;
        }
        if (participantRemoved) break;
      }
      
      if (participantRemoved) {
        setRounds(updatedRounds);
      }
      
      return;
    }
    
    // Place the participant in the clicked slot
    const updatedRounds = [...rounds];
    let participantPlaced = false;
    
    for (let r = 0; r < updatedRounds.length; r++) {
      for (let m = 0; m < updatedRounds[r].matches.length; m++) {
        for (let s = 0; s < updatedRounds[r].matches[m].slots.length; s++) {
          const slot = updatedRounds[r].matches[m].slots[s];
          
          if (slot.id === slotId) {
            slot.participant = selectedParticipant;
            participantPlaced = true;
            break;
          }
        }
        if (participantPlaced) break;
      }
      if (participantPlaced) break;
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
      
      setRounds(updatedRounds);
      setSelectedParticipant(null);
    }
  };

  // Handle declaring a winner/advancing a participant
  const handleAdvance = (match, participant) => {
    if (!participant) return;
    
    let matchRound = -1;
    let matchPosition = -1;
    
    for (let r = 0; r < rounds.length; r++) {
      const matchIndex = rounds[r].matches.findIndex(m => m.id === match.id);
      if (matchIndex !== -1) {
        matchRound = r;
        matchPosition = matchIndex;
        break;
      }
    }
    
    if (matchRound === -1 || matchRound === rounds.length - 1) return; // Can't advance from final round
    
    const nextRound = matchRound + 1;
    const nextPosition = Math.floor(matchPosition / 2);
    const isFirstSlot = matchPosition % 2 === 0;
    
    const nextRoundMatches = rounds[nextRound].matches;
    if (nextPosition >= nextRoundMatches.length) return;
    
    const nextMatch = nextRoundMatches[nextPosition];
    const slotIndex = isFirstSlot ? 0 : 1;
    
    const updatedRounds = [...rounds];
    updatedRounds[nextRound].matches[nextPosition].slots[slotIndex].participant = participant;
    

    if (matchRound === rounds.length - 2) { // Semi-finals
      const loser = match.slots.find(slot => 
        slot.participant && slot.participant.id !== participant.id
      )?.participant;
      
      if (loser) {
        setThirdPlace(loser);
      }
    }
    
    setRounds(updatedRounds);
  };

  // Check if a participant is already placed
  const isParticipantPlaced = (participant) => {
    return participant.isPlaced;
  };

  // Save the tournament winners to the database after champion is declared
  const saveTournamentWinners = async () => {
    if (!tournamentWinner) return null;
    
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
      
      const response = await fetch(`/api/tournaments/${tournament.id}/winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ winners }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to save tournament winners:", data.message);
        return null;
      }
      
      const data = await response.json();
      return data.tournament;
    } catch (error) {
      console.error("Error saving tournament winners:", error);
      return null;
    }
  };

  const saveBracket = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    try {
      const bracketData = {
        rounds: rounds.map(round => ({
          id: round.id,
          name: round.name,
          matches: round.matches.map(match => {
            // Find if this match exists in a future round to determine the winner
            const winner = findAdvancedParticipant(match);
            
            let isFinalMatch = false;
            for (let r = 0; r < rounds.length; r++) {
              const matchIndex = rounds[r].matches.findIndex(m => m.id === match.id);
              if (matchIndex !== -1) {
                isFinalMatch = r === rounds.length - 1;
                break;
              }
            }
            
            // If this is the final match, also track the runner-up (loser of final)
            if (isFinalMatch && match.slots[0].participant && match.slots[1].participant) {
              if (tournamentWinner && match.slots[0].participant.id === tournamentWinner.id) {
                setRunnerUp(match.slots[1].participant);
              } else if (tournamentWinner && match.slots[1].participant.id === tournamentWinner.id) {
                setRunnerUp(match.slots[0].participant);
              }
            }
            
            return {
              id: match.id,
              player1: match.slots[0].participant ? {
                id: match.slots[0].participant.id,
                participantId: match.slots[0].participant.participantId
              } : null,
              player2: match.slots[1].participant ? {
                id: match.slots[1].participant.id,
                participantId: match.slots[1].participant.participantId
              } : null,
              winnerId: isFinalMatch ? 
                (tournamentWinner ? tournamentWinner.id : null) : 
                (winner ? winner.id : null)
            };
          })
        })),
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
        const updatedTournament = await saveTournamentWinners();
        if (updatedTournament) {
          winnersSaved = true;
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

  // Handle declaring a champion from the final match
  const handleDeclareChampion = (participant) => {
    if (!participant) return;
    
    const finalRound = rounds[rounds.length - 1];
    if (finalRound && finalRound.matches && finalRound.matches.length > 0) {
      const finalMatch = finalRound.matches[0];
      
      if (finalMatch.slots[0].participant && finalMatch.slots[1].participant) {
        if (finalMatch.slots[0].participant.id === participant.id) {
          setRunnerUp(finalMatch.slots[1].participant);
        } else {
          setRunnerUp(finalMatch.slots[0].participant);
        }
      }
    }
    
    setTournamentWinner(participant);
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
        {participant.name}
        {isSelected && " ✓"}
      </div>
    );
  };

  // Render a bracket slot
  const renderSlot = (slot) => {
    const isHighlighted = selectedParticipant && !slot.participant;
    
    return (
      <div
        key={slot.id}
        className={`p-2 min-h-[40px] border-b flex items-center justify-between ${
          isHighlighted ? 'bg-green-100' : slot.participant ? 'bg-gray-50' : 'bg-white'
        } cursor-pointer hover:bg-gray-100`}
        onClick={() => handleSlotClick(slot.id)}
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

  // Render a match (pair of slots)
  const renderMatch = (match) => {
    const hasAdvanced = findAdvancedParticipant(match) !== null;
    
    let isFinalMatch = false;
    for (let r = 0; r < rounds.length; r++) {
      const matchIndex = rounds[r].matches.findIndex(m => m.id === match.id);
      if (matchIndex !== -1) {
        isFinalMatch = r === rounds.length - 1;
        break;
      }
    }
    
    return (
      <div key={match.id} className="border rounded-md overflow-hidden mb-4">
        {match.slots.map(slot => renderSlot(slot))}
        
        {!isFinalMatch && !hasAdvanced && !viewOnly && (
          <>
            {/* Only show advance buttons if both slots have participants */}
            {match.slots[0].participant && match.slots[1].participant && (
              <div className="flex justify-between bg-gray-100 p-2">
                <button 
                  onClick={() => handleAdvance(match, match.slots[0].participant)}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  Advance {match.slots[0].participant?.name || 'Player 1'}
                </button>
                <button 
                  onClick={() => handleAdvance(match, match.slots[1].participant)}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  Advance {match.slots[1].participant?.name || 'Player 2'}
                </button>
              </div>
            )}
            
            {/* For matches with only one participant (bye), show just one advance button */}
            {((match.slots[0].participant && !match.slots[1].participant) || 
              (!match.slots[0].participant && match.slots[1].participant)) && (
              <div className="bg-gray-100 p-2 text-center">
                <button 
                  onClick={() => handleAdvance(match, match.slots[0].participant || match.slots[1].participant)}
                  className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  Advance {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} (Bye)
                </button>
              </div>
            )}
          </>
        )}
        
        {/* For final match */}
        {isFinalMatch && !tournamentWinner  && !viewOnly && (
          <>
            {match.slots[0].participant && match.slots[1].participant && (
              <div className="flex justify-between bg-yellow-100 p-2">
                <button 
                  onClick={() => handleDeclareChampion(match.slots[0].participant)}
                  className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                >
                  Declare {match.slots[0].participant?.name || 'Player 1'} Champion
                </button>
                <button 
                  onClick={() => handleDeclareChampion(match.slots[1].participant)}
                  className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                >
                  Declare {match.slots[1].participant?.name || 'Player 2'} Champion
                </button>
              </div>
            )}
            
            {((match.slots[0].participant && !match.slots[1].participant) || 
              (!match.slots[0].participant && match.slots[1].participant)) && (
              <div className="bg-yellow-100 p-2 text-center">
                <button 
                  onClick={() => handleDeclareChampion(match.slots[0].participant || match.slots[1].participant)}
                  className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                >
                  Declare {match.slots[0].participant?.name || match.slots[1].participant?.name || 'Player'} Champion
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Show who advanced */}
        {!isFinalMatch && hasAdvanced && (
          <div className="bg-green-100 p-2 text-center text-green-800 text-sm font-medium">
            {findAdvancedParticipant(match)?.name} advanced
          </div>
        )}
        
        {/* Show the tournament winner for final match */}
        {isFinalMatch && tournamentWinner && (
          <div className="bg-yellow-100 p-3 text-center text-yellow-800 font-bold">
            🏆 {tournamentWinner.name} is the Champion! 🏆
          </div>
        )}
      </div>
    );
  };

  // Render matches)
  const renderRound = (round) => {
    return (
      <div key={round.id} className="flex-none w-64">
        <h3 className="text-center font-semibold mb-4">{round.name}</h3>
        <div className="space-y-4">
          {round.matches.map(match => renderMatch(match))}
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
        </div>
      </div>
    );
  };

const renderBracketSkeleton = () => {
  return (
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
  );
};

return (
  <div>
    <h2 className="text-2xl font-bold text-gray-800 mb-4">Tournament Bracket</h2>
    
    {/* Winner display at the top when there's a champion */}
    {tournamentWinner && renderWinnerDisplay()}
    
    <div className="flex flex-col md:flex-row gap-6">
  {!viewOnly && (
    <div className="md:w-1/4">
      <h3 className="font-semibold mb-2">Participants</h3>
      <p className="text-sm text-gray-500 mb-2">
        Click a participant, then click a bracket slot to place them.
      </p>
      <div className="border rounded p-3 bg-gray-50 max-h-[400px] overflow-y-auto">
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
      <div className="flex space-x-6 pb-4">
        {rounds.map(round => renderRound(round))}
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