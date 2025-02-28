"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";

const TournamentBracket = ({ tournament }) => {
  const { data: session } = useSession();
  const [bracketData, setBracketData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatingBracket, setGeneratingBracket] = useState(false);

  const isCreator = session?.user?.id === tournament?.createdBy?.id;
  const isStarted = tournament?.status === "IN_PROGRESS" || tournament?.status === "COMPLETED";

  useEffect(() => {
    if (tournament?.id) {
      fetchBracketData();
    }
  }, [tournament]);

  const fetchBracketData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournament.id}/bracket`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch bracket data');
      }
      
      const data = await response.json();
      console.log("Fetched bracket data:", data);
      
      setBracketData(data);
      if (data.matches && data.matches.length > 0) {
        setMatches(data.matches);
      }
      
      try {
        // Fetch participants
        const participantsResponse = await fetch(`/api/tournaments/${tournament.id}/participants`);
        
        if (participantsResponse.ok) {
          const participantsData = await participantsResponse.json();
          setParticipants(participantsData.participants || []);
        } else {
          console.warn("Could not fetch participants");
        }
      } catch (err) {
        console.warn("Error fetching participants:", err);
      }
    } catch (err) {
      console.error('Error fetching bracket data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateBracket = async () => {
    try {
      setGeneratingBracket(true);
      setError(null);

      const response = await fetch(`/api/tournaments/${tournament.id}/bracket/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate bracket');
      }
      
      const data = await response.json();
      console.log("Generated bracket data:", data);
      
      setBracketData(data);
      if (data.matches) {
        setMatches(data.matches);
      }
      
      // Re-fetch the bracket to ensure we have the latest data
      await fetchBracketData();
    } catch (err) {
      console.error('Error generating bracket:', err);
      setError(err.message);
    } finally {
      setGeneratingBracket(false);
    }
  };

  const getDisplayName = (user) => {
    if (!user) return 'Empty Slot';
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "Anonymous User";
  };

  const renderBracketControls = () => {
    if (!isCreator || isStarted) {
      return null;
    }

    const canGenerateBracket = tournament.participants?.length >= 2;
    
    return (
      <div className="mb-6">
        <button
          onClick={generateBracket}
          disabled={generatingBracket || !canGenerateBracket}
          className={`px-4 py-2 rounded-md ${
            canGenerateBracket
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {generatingBracket ? 'Generating...' : 'Generate Bracket'}
        </button>
        
        {!canGenerateBracket && (
          <p className="text-red-500 text-sm mt-2">
            At least 2 participants are required to generate a bracket.
          </p>
        )}
        
        {tournament.seedingType === "MANUAL" && tournament.hasManualSeeding && (
          <p className="text-green-600 text-sm mt-2">
            ✓ Manual seeding will be used for bracket generation
          </p>
        )}
      </div>
    );
  };

  const renderBracketStructure = () => {
    if (!matches || matches.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-600">
            {isCreator && !isStarted 
              ? 'Generate the bracket to see the tournament structure'
              : 'No bracket data available yet'}
          </p>
        </div>
      );
    }

    // Calculate max rounds
    const totalRounds = bracketData?.rounds || Math.max(...matches.map(m => m.round)) + 1;
    
    // Create round headers
    const roundHeaders = [];
    for (let i = 0; i < totalRounds; i++) {
      roundHeaders.push(
        <div key={`header-${i}`} className="text-center font-semibold mb-4 w-64">
          {i === 0 
            ? 'Round 1' 
            : i === totalRounds - 1 
              ? 'Final' 
              : `Round ${i + 1}`}
        </div>
      );
    }
    
    // Organize matches by round and position
    const roundsMap = {};
    for (let i = 0; i < totalRounds; i++) {
      roundsMap[i] = matches.filter(m => m.round === i).sort((a, b) => a.position - b.position);
    }
    
    // Get power of 2 closest to match count in round 0
    const round0Count = roundsMap[0]?.length || 0;
    const perfectBracketSize = Math.pow(2, Math.ceil(Math.log2(round0Count)));
    const matchesPerRound = [];
    
    for (let i = 0; i < totalRounds; i++) {
      matchesPerRound[i] = perfectBracketSize / Math.pow(2, i + 1);
    }

    // Generate match boxes for each round
    const roundElements = [];
    for (let roundIdx = 0; roundIdx < totalRounds; roundIdx++) {
      const matchElements = [];
      
      // Add matches for this round
      const roundMatches = roundsMap[roundIdx] || [];
      
      for (let matchPos = 0; matchPos < matchesPerRound[roundIdx]; matchPos++) {
        const match = roundMatches.find(m => m.position === matchPos);
        
        matchElements.push(
          <div key={`round-${roundIdx}-match-${matchPos}`} className="border rounded overflow-hidden mb-4">
            <div className="p-2 border-b bg-gray-50">
              {match?.player1 ? getDisplayName(match.player1) : 'Empty Slot'}
            </div>
            <div className="p-2 bg-gray-50">
              {match?.player2 ? getDisplayName(match.player2) : 'Empty Slot'}
            </div>
          </div>
        );
      }
      
      roundElements.push(
        <div key={`round-${roundIdx}`} className="flex-none w-64 mx-4">
          {roundHeaders[roundIdx]}
          <div className="space-y-2">
            {matchElements}
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex overflow-x-auto py-4 pb-4">
        {roundElements}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading bracket...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Tournament Bracket</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {renderBracketControls()}
      
      <div className="bg-white rounded-lg border border-gray-200 p-4 overflow-x-auto">
        {renderBracketStructure()}
      </div>
    </div>
  );
};

export default TournamentBracket;