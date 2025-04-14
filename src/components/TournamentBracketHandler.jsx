"use client";

import React, { useState, useEffect } from 'react';
import { initializeParticipants, loadParticipantsFromBracket } from '@/utils/participantUtils';
import { initializeBracket } from '@/utils/bracketUtils';
import { fetchExistingBracket, prepareBracketDataForSave } from '@/utils/bracketApi';
import RoundRobinBracket from './RoundRobinBracket';
import DoubleEliminationBracket from './DoubleEliminationBracket';
import SingleEliminationBracket from './SingleEliminationBracket';

const TournamentBracketsHandler = ({ tournament, currentUser, isOwner }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [bracket, setBracket] = useState(null);
  const [tournamentWinner, setTournamentWinner] = useState(null);
  const [runnerUp, setRunnerUp] = useState(null);
  const [thirdPlace, setThirdPlace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  // Initialize the participants and bracket
  useEffect(() => {
    const loadBracket = async () => {
      try {
        setLoading(true);
        setError(null);

        // Map participants for bracket usage
        const mappedParticipants = initializeParticipants(tournament.participants);

        // Check for existing winners from tournament data
        if (tournament.winners && tournament.winners.length > 0) {
          // Sort winners by position (1=first, 2=second, 3=third)
          const sortedWinners = tournament.winners.sort((a, b) => a.position - b.position);

          // Find first place winner
          const firstPlace = sortedWinners.find(w => w.position === 1);
          if (firstPlace) {
            const winner = mappedParticipants.find(p => p.id === firstPlace.user.id);
            if (winner) setTournamentWinner(winner);
          }

          // Find second place
          const secondPlace = sortedWinners.find(w => w.position === 2);
          if (secondPlace) {
            const runnerUp = mappedParticipants.find(p => p.id === secondPlace.user.id);
            if (runnerUp) setRunnerUp(runnerUp);
          }

          // Find third place
          const thirdPlace = sortedWinners.find(w => w.position === 3);
          if (thirdPlace) {
            const third = mappedParticipants.find(p => p.id === thirdPlace.user.id);
            if (third) setThirdPlace(third);
          }
        }
        // If no winners in tournament.winners but tournament has a winner property
        else if (tournament.winner) {
          const winnerObj = mappedParticipants.find(p => p.id === tournament.winner.id);
          if (winnerObj) setTournamentWinner(winnerObj);
        }

        // Try to fetch existing bracket data
        const existingBracket = await fetchExistingBracket(tournament.id);

        // If we have existing bracket data, update participant placement status
        if (existingBracket) {
          const updatedParticipants = loadParticipantsFromBracket(
            mappedParticipants,
            existingBracket
          );
          setParticipants(updatedParticipants);
        } else {
          setParticipants(mappedParticipants);
        }

        // Initialize bracket based on tournament format and participant count
        const participantCount = tournament.participants.length;
        const initialBracket = initializeBracket(participantCount, tournament.format);
        setBracket(initialBracket);

        setLoading(false);
      } catch (err) {
        console.error("Error loading bracket:", err);
        setError("Failed to load bracket data");
        setLoading(false);
      }
    };

    if (tournament?.participants) {
      loadBracket();
    }
  }, [tournament]);

  // Save the bracket data
  const saveBracket = async (bracketData) => {
    try {
      setSaving(true);
      setSavedMessage("");

      if (!isOwner) {
        throw new Error("Only tournament owner can save bracket");
      }

      // Add winners to bracket data if available
      if (tournamentWinner) {
        bracketData.tournamentWinnerId = tournamentWinner.id;
      }

      const response = await fetch(`/api/tournaments/${tournament.id}/bracket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bracketData),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save bracket");
      }

      // After successfully saving the bracket, also save tournament winners
      if (tournamentWinner || runnerUp || thirdPlace) {
        await saveWinners();
      }

      setSavedMessage("Bracket saved successfully!");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err) {
      console.error("Error saving bracket:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Function to save tournament winners to the database
  const saveWinners = async () => {
    try {
      const winners = [];

      if (tournamentWinner) {
        winners.push({
          userId: tournamentWinner.id,
          position: 1,
          prizeMoney: tournament.prizePool * 0.5 // 50% to 1st place
        });
      }

      if (runnerUp) {
        winners.push({
          userId: runnerUp.id,
          position: 2,
          prizeMoney: tournament.prizePool * 0.3 // 30% to 2nd place
        });
      }

      if (thirdPlace) {
        winners.push({
          userId: thirdPlace.id,
          position: 3,
          prizeMoney: tournament.prizePool * 0.2 // 20% to 3rd place
        });
      }

      if (winners.length > 0) {
        const response = await fetch(`/api/tournaments/${tournament.id}/winners`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ winners }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error("Failed to save tournament winners");
        }
      }
    } catch (err) {
      console.error("Error saving winners:", err);
      // Don't throw here, as we still want to save the bracket
    }
  };

  // Handle save for bracket with different formats
  const handleSaveSingleEliminationBracket = () => {
    if (!bracket || !bracket.winnersBracket) return;

    // Prepare bracket data for saving
    const bracketData = prepareBracketDataForSave(
      bracket.winnersBracket,
      [],
      null,
      null,
      tournamentWinner
    );

    saveBracket(bracketData);
  };

  const handleSaveDoubleEliminationBracket = () => {
    if (!bracket) return;

    // Prepare bracket data for saving
    const bracketData = prepareBracketDataForSave(
      bracket.winnersBracket,
      bracket.losersBracket,
      bracket.grandFinals,
      bracket.resetMatch,
      tournamentWinner
    );

    saveBracket(bracketData);
  };

  // Render participants list for bracket assignment
  const renderParticipantsList = () => {
    if (!participants || participants.length === 0) {
      return (
        <div className="p-4 border rounded-md bg-gray-50">
          <p className="text-gray-500">No participants in this tournament yet.</p>
        </div>
      );
    }

    if (tournament.format === 'ROUND_ROBIN' && tournament.seedingType !== 'MANUAL') {
      return (
        <div className="bg-white p-4 border rounded-md shadow-sm">
          <h3 className="text-lg font-medium mb-3">Participants</h3>
          <p className="text-blue-600">
            This tournament uses {tournament.seedingType === 'RANDOM' ? 'random' : 'skill-based'} seeding.
            Participants will be automatically placed in groups.
          </p>
        </div>
      );
    }

    const unplacedParticipants = participants.filter(p => !p.isPlaced);

    return (
      <div className="bg-white p-4 border rounded-md shadow-sm">
        <h3 className="text-lg font-medium mb-3">Participants</h3>
        {unplacedParticipants.length === 0 ? (
          <p className="text-green-600">
            All participants have been placed in the bracket
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {participants.map(participant => (
              <div
                key={participant.id}
                className={`border p-2 rounded-md cursor-pointer 
                  ${participant.isPlaced ? "bg-gray-200" : "hover:bg-blue-50"} 
                  ${selectedParticipant?.id === participant.id ? "bg-blue-100 border-blue-400" : ""}`}
                onClick={() => !participant.isPlaced && setSelectedParticipant(participant)}
              >
                <div className="flex items-center">
                  {participant.seedNumber && (
                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs mr-2">
                      {participant.seedNumber}
                    </span>
                  )}
                  <span className={participant.isPlaced ? "line-through text-gray-500" : ""}>
                    {participant.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700">
        <p className="font-medium">Error loading bracket</p>
        <p>{error}</p>
      </div>
    );
  }

  // If there are no participants yet, show a message
  if (!tournament.participants || tournament.participants.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50 text-center">
        <p className="text-lg text-gray-600">
          No participants have joined this tournament yet. Check back later.
        </p>
      </div>
    );
  }

  // If there are fewer participants than required, show a warning
  if (tournament.participants.length < 3) {
    return (
      <div className="p-6 border rounded-md bg-yellow-50 text-center">
        <p className="text-lg text-yellow-700">
          This tournament needs at least 3 participants to generate a bracket.
          Current count: {tournament.participants.length}
        </p>
      </div>
    );
  }

  // Saved message notification
  const savedNotification = savedMessage ? (
    <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
      {savedMessage}
    </div>
  ) : null;

  // Render bracket based on tournament format
  return (
    <div className="space-y-6">
      {isOwner && <div className="mb-6">{renderParticipantsList()}</div>}

      {/* Tournament Results */}
      <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Tournament Results</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🏆</span>
            <span className="font-medium">First Place:</span>
            <span className="ml-2">{tournamentWinner ? tournamentWinner.name : "Not decided"}</span>
            {tournamentWinner && <span className="ml-2 text-green-600">${(tournament.prizePool * 0.5).toFixed(2)}</span>}
          </div>
          <div className="flex items-center">
            <span className="text-2xl mr-2">🥈</span>
            <span className="font-medium">Second Place:</span>
            <span className="ml-2">{runnerUp ? runnerUp.name : "Not decided"}</span>
            {runnerUp && <span className="ml-2 text-green-600">${(tournament.prizePool * 0.3).toFixed(2)}</span>}
          </div>
          <div className="flex items-center">
            <span className="text-2xl mr-2">🥉</span>
            <span className="font-medium">Third Place:</span>
            <span className="ml-2">{thirdPlace ? thirdPlace.name : "Not decided"}</span>
            {thirdPlace && <span className="ml-2 text-green-600">${(tournament.prizePool * 0.2).toFixed(2)}</span>}
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600">
        </p>
      </div>

      {/* Render the appropriate bracket type based on tournament format */}
      {tournament.format === 'ROUND_ROBIN' && (
        <RoundRobinBracket
          tournament={tournament}
          participants={participants}
          setParticipants={setParticipants}
          selectedParticipant={selectedParticipant}
          setSelectedParticipant={setSelectedParticipant}
          setTournamentWinner={setTournamentWinner}
          tournamentWinner={tournamentWinner}
          setRunnerUp={setRunnerUp}
          runnerUp={runnerUp}
          setThirdPlace={setThirdPlace}
          thirdPlace={thirdPlace}
          viewOnly={!isOwner}
          saveBracket={saveBracket}
        />
      )}

      {/* Double Elimination Bracket */}
      {tournament.format === 'DOUBLE_ELIMINATION' && (
        <DoubleEliminationBracket
          tournament={tournament}
          participants={participants}
          setParticipants={setParticipants}
          selectedParticipant={selectedParticipant}
          setSelectedParticipant={setSelectedParticipant}
          setTournamentWinner={setTournamentWinner}
          setRunnerUp={setRunnerUp}
          setThirdPlace={setThirdPlace}
          viewOnly={!isOwner}
          saveBracket={saveBracket}
        />
      )}

      {/* Single Elimination Bracket */}
      {tournament.format === 'SINGLE_ELIMINATION' && (
        <SingleEliminationBracket
          tournament={tournament}
          participants={participants}
          setParticipants={setParticipants}
          selectedParticipant={selectedParticipant}
          setSelectedParticipant={setSelectedParticipant}
          setTournamentWinner={setTournamentWinner}
          setRunnerUp={setRunnerUp}
          viewOnly={!isOwner}
          saveBracket={saveBracket}
        />
      )}

      {/* Save Button for tournament organizer */}
      {/* Save Button for tournament organizer */}
      {isOwner && (
        <div className="flex justify-end mt-6">
          <button
            onClick={() => {
              if (tournament.format === 'SINGLE_ELIMINATION') {


                const event = new CustomEvent('saveSingleEliminationBracket');
                document.dispatchEvent(event);
              } else if (tournament.format === 'DOUBLE_ELIMINATION') {

                const event = new CustomEvent('saveDoubleEliminationBracket');
                document.dispatchEvent(event);
              } else if (tournament.format === 'ROUND_ROBIN') {
                const event = new CustomEvent('saveRoundRobinBracket');
                document.dispatchEvent(event);
              }
            }}
            disabled={saving}
            className={`px-6 py-2 rounded-md ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-medium transition-colors`}
          >
            {saving ? 'Saving...' : 'Save Bracket'}
          </button>
        </div>
      )}
      {savedNotification}
    </div>
  );
};

export default TournamentBracketsHandler;