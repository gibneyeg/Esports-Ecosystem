"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { initializeParticipants, loadParticipantsFromBracket } from '@/utils/participantUtils';
import { initializeBracket } from '@/utils/bracketUtils';
import { fetchExistingBracket, prepareBracketDataForSave } from '@/utils/bracketApi';
import RoundRobinBracket from './RoundRobinBracket';
import DoubleEliminationBracket from './DoubleEliminationBracket';
import SingleEliminationBracket from './SingleEliminationBracket';
import SwissBracket from './SwissBracket';

const TournamentBracketsHandler = ({ tournament, currentUser }) => {
  const { data: session } = useSession();
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
  const [access, setAccess] = useState({
    canEdit: false,
    canManage: false,
    role: null,
    hasAccess: false
  });
  const [accessLoading, setAccessLoading] = useState(true);

  // Check user's tournament access level
  useEffect(() => {
    const checkAccess = async () => {
      if (!session?.user?.id || !tournament?.id) {
        setAccessLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/tournaments/${tournament.id}/check-access`);
        if (response.ok) {
          const data = await response.json();
          setAccess(data);
        }
      } catch (error) {
        console.error("Error checking access:", error);
      } finally {
        setAccessLoading(false);
      }
    };

    checkAccess();
  }, [session, tournament?.id]);

  // Initialize the participants and bracket
  useEffect(() => {
    const loadBracket = async () => {
      if (accessLoading) return;

      try {
        setLoading(true);
        setError(null);

        const mappedParticipants = initializeParticipants(tournament.participants);

        // Check for existing winners from tournament data
        if (tournament.winners && tournament.winners.length > 0) {
          const sortedWinners = tournament.winners.sort((a, b) => a.position - b.position);

          const firstPlace = sortedWinners.find(w => w.position === 1);
          if (firstPlace) {
            const winner = mappedParticipants.find(p => p.id === firstPlace.user.id);
            if (winner) setTournamentWinner(winner);
          }

          const secondPlace = sortedWinners.find(w => w.position === 2);
          if (secondPlace) {
            const runnerUp = mappedParticipants.find(p => p.id === secondPlace.user.id);
            if (runnerUp) setRunnerUp(runnerUp);
          }

          const thirdPlace = sortedWinners.find(w => w.position === 3);
          if (thirdPlace) {
            const third = mappedParticipants.find(p => p.id === thirdPlace.user.id);
            if (third) setThirdPlace(third);
          }
        }
        else if (tournament.winner) {
          const winnerObj = mappedParticipants.find(p => p.id === tournament.winner.id);
          if (winnerObj) setTournamentWinner(winnerObj);
        }

        const existingBracket = await fetchExistingBracket(tournament.id);

        if (existingBracket) {
          const updatedParticipants = loadParticipantsFromBracket(
            mappedParticipants,
            existingBracket
          );
          setParticipants(updatedParticipants);
        } else {
          setParticipants(mappedParticipants);
        }

        const participantCount = tournament.participants.length;
        // Only initialize for non-Swiss formats 
        if (tournament.format !== 'SWISS') {
          const initialBracket = initializeBracket(participantCount, tournament.format);
          setBracket(initialBracket);
        }

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
  }, [tournament, accessLoading]);

  // Save the bracket data
  const saveBracket = async (bracketData) => {
    try {
      setSaving(true);
      setSavedMessage("");

      if (!access.canManage) {
        throw new Error("You don't have permission to save bracket");
      }

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

  // Function to save tournament winners 
  const saveWinners = async () => {
    try {
      const winners = [];

      if (tournamentWinner) {
        winners.push({
          userId: tournamentWinner.id,
          position: 1,
          prizeMoney: tournament.prizePool * 0.5
        });
      }

      if (runnerUp) {
        winners.push({
          userId: runnerUp.id,
          position: 2,
          prizeMoney: tournament.prizePool * 0.3
        });
      }

      if (thirdPlace) {
        winners.push({
          userId: thirdPlace.id,
          position: 3,
          prizeMoney: tournament.prizePool * 0.2
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
    }
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

    // Skip rendering participants list for Swiss and auto-seeded Round Robin
    if (tournament.format === 'ROUND_ROBIN' && tournament.seedingType !== 'MANUAL') {
      return (
        <div className="bg-white p-4 border rounded-md shadow-sm">
          <h3 className="text-lg font-medium mb-3">Participants</h3>
          <p className="text-blue-600">
            This tournament uses {tournament.seedingType === 'RANDOM' ? 'random' : 'skill-based'} seeding.
            Participants will be automatically placed in the bracket.
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

  if (loading || accessLoading) {
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

  const savedNotification = savedMessage ? (
    <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
      {savedMessage}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Show user's role if they have  differnt permissions */}
      {access.hasAccess && access.role && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          Your role: {access.role === 'OWNER' ? 'Tournament Owner' : access.role}
        </div>
      )}

      {access.canManage && tournament.format !== 'SWISS' && <div className="mb-6">{renderParticipantsList()}</div>}

      {tournament.format !== 'SWISS' && (
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
        </div>
      )}

      {/* Round Robin Bracket */}
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
          viewOnly={!access.canManage}
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
          viewOnly={!access.canManage}
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
          setThirdPlace={setThirdPlace}
          viewOnly={!access.canManage}
          saveBracket={saveBracket}
        />
      )}

      {/* Swiss Tournament Bracket */}
      {tournament.format === 'SWISS' && (
        <SwissBracket
          tournament={tournament}
          participants={participants}
          setParticipants={setParticipants}
          setTournamentWinner={setTournamentWinner}
          setRunnerUp={setRunnerUp}
          setThirdPlace={setThirdPlace}
          viewOnly={!access.canManage}
          saveBracket={saveBracket}
          isTeamTournament={false}
        />
      )}

      {/* Save Button  */}
      {access.canManage && (
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
              } else if (tournament.format === 'SWISS') {
                const event = new CustomEvent('saveSwissBracket');
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