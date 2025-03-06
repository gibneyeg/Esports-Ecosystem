"use client";

import React, { useState, useEffect } from 'react';
import { initializeBracket } from '@/utils/bracketUtils';
import { fetchExistingBracket } from '@/utils/bracketApi';
import { prepareBracketDataForSave } from '@/utils/bracketApi';
import { loadParticipantsFromBracket, findParticipantById } from '@/utils/participantUtils';

const SingleEliminationBracket = ({ 
  tournament, 
  participants, 
  setParticipants, 
  selectedParticipant, 
  setSelectedParticipant,
  setTournamentWinner,
  setRunnerUp,
  viewOnly,
  saveBracket
}) => {
  const [winnersBracket, setWinnersBracket] = useState([]);
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
        
        // Create a map of matches by round
        const matchesByRound = {};
        bracketData.matches.forEach(match => {
          if (!matchesByRound[match.round]) {
            matchesByRound[match.round] = [];
          }
          matchesByRound[match.round].push(match);
        });
        
        // Fill in the bracket with existing data
        Object.keys(matchesByRound).forEach(roundIndex => {
          const roundMatches = matchesByRound[roundIndex];
          
          if (roundIndex < updatedWinnersBracket.length) {
            roundMatches.forEach(match => {
              const matchIndex = match.position;
              
              if (matchIndex < updatedWinnersBracket[roundIndex].matches.length) {
                const currentMatch = updatedWinnersBracket[roundIndex].matches[matchIndex];
                
                if (match.player1) {
                  const participant = findParticipantById(participants, match.player1.id);
                  if (participant) {
                    currentMatch.slots[0].participant = participant;
                  }
                }
                
                if (match.player2) {
                  const participant = findParticipantById(participants, match.player2.id);
                  if (participant) {
                    currentMatch.slots[1].participant = participant;
                  }
                }
              }
            });
          }
        });
        
        setWinnersBracket(updatedWinnersBracket);
        
        // Update participants' placed status
        const updatedParticipants = loadParticipantsFromBracket(participants, bracketData);
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
        }
      } else {
        // Create a new bracket
        const { winnersBracket } = initializeBracket(participants.length, 'SINGLE_ELIMINATION');
        setWinnersBracket(winnersBracket);
      }
      
      setIsInitialized(true);
    };
    
    initializeTournamentBracket();
  }, [tournament, participants, isInitialized, setParticipants, setTournamentWinner, setRunnerUp]);
  
  // Listen for save event
  useEffect(() => {
    const handleSave = () => {
      const bracketData = prepareBracketDataForSave(winnersBracket);
      saveBracket(bracketData);
    };
    
    document.addEventListener('saveSingleEliminationBracket', handleSave);
    
    return () => {
      document.removeEventListener('saveSingleEliminationBracket', handleSave);
    };
  }, [winnersBracket, saveBracket]);
  
  const handleSlotClick = (slotId) => {
    if (viewOnly) return;
    
    if (!selectedParticipant) {
      // If no participant is selected, check if we need to remove one
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
      
      return;
    }
    
    // If a participant is selected, place them in the slot
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
  
  const handleWinnersAdvance = (match, participant) => {
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
    
    const nextMatch = getNextWinnersMatch(matchRound, matchPosition);
    
    if (nextMatch) {
      const updatedWinnersBracket = [...winnersBracket];
      updatedWinnersBracket[nextMatch.round].matches[nextMatch.position].slots[nextMatch.slotIndex].participant = participant;
      setWinnersBracket(updatedWinnersBracket);
    }
  };
  
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
    
    if (isFinal) {
      return (
        <div key={match.id} className="border-2 border-yellow-400 rounded-md overflow-hidden mb-4">
          <h4 className="bg-yellow-100 text-yellow-800 font-semibold p-2 text-center">Finals</h4>
          {match.slots.map(slot => renderSlot(slot))}
          
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
    }
    
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
        </div>
      </div>
    </div>
  );
};

export default SingleEliminationBracket;