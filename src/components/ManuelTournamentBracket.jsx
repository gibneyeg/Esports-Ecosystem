"use client";

import React, { useState, useEffect, useMemo } from 'react';
import SingleEliminationBracket from './SingleEliminationBracket';
import DoubleEliminationBracket from './DoubleEliminationBracket';
import { fetchExistingBracket } from '@/utils/bracketApi';
import { initializeParticipants } from '@/utils/participantUtils';

const ManualTournamentBracket = ({ tournament, currentUser, isOwner }) => {
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [tournamentWinner, setTournamentWinner] = useState(null);
  const [runnerUp, setRunnerUp] = useState(null);
  const [thirdPlace, setThirdPlace] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentFormat, setTournamentFormat] = useState('SINGLE_ELIMINATION');

  const viewOnly = useMemo(() => !isOwner, [isOwner]);

  useEffect(() => {
    if (isInitialized) return;
    
    let mounted = true;
    
    const initializeTournament = async () => {
      if (!tournament?.participants) return;
      
      setIsLoading(true);
      
      if (tournament.format) {
        setTournamentFormat(tournament.format);
      }
      
      const mappedParticipants = initializeParticipants(tournament.participants);
      
      if (mounted) setParticipants(mappedParticipants);
      
      setIsInitialized(true);
      setIsLoading(false);
    };
    
    initializeTournament();
    
    return () => {
      mounted = false;
    };
  }, [tournament, isInitialized]);

  const handleParticipantClick = (participant) => {
    if (viewOnly) return;
    setSelectedParticipant(participant);
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

  const saveBracket = async (bracketData) => {
    setSaving(true);
    setSaveMessage(null);
    
    try {
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
            <>
              {tournamentFormat === 'SINGLE_ELIMINATION' ? (
                <SingleEliminationBracket 
                  tournament={tournament}
                  participants={participants}
                  setParticipants={setParticipants}
                  selectedParticipant={selectedParticipant}
                  setSelectedParticipant={setSelectedParticipant}
                  setTournamentWinner={setTournamentWinner}
                  setRunnerUp={setRunnerUp}
                  viewOnly={viewOnly}
                  saveBracket={saveBracket}
                />
              ) : (
                <DoubleEliminationBracket 
                  tournament={tournament}
                  participants={participants}
                  setParticipants={setParticipants}
                  selectedParticipant={selectedParticipant}
                  setSelectedParticipant={setSelectedParticipant}
                  setTournamentWinner={setTournamentWinner}
                  setRunnerUp={setRunnerUp}
                  setThirdPlace={setThirdPlace}
                  viewOnly={viewOnly}
                  saveBracket={saveBracket}
                />
              )}
            </>
          )}
        </div>
      </div>
      
      {!viewOnly && (
        <div className="mt-6">
          <button 
            onClick={() => tournamentFormat === 'SINGLE_ELIMINATION' 
              ? document.dispatchEvent(new CustomEvent('saveSingleEliminationBracket')) 
              : document.dispatchEvent(new CustomEvent('saveDoubleEliminationBracket'))
            } 
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