"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";

const SwissBracket = ({
    tournament,
    participants,
    setTournamentWinner,
    setRunnerUp,
    setThirdPlace,
    viewOnly,
    saveBracket,
    isTeamTournament: isTeamTournamentProp
}) => {
    const [rounds, setRounds] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [participantScores, setParticipantScores] = useState({});
    const [currentRound, setCurrentRound] = useState(0);
    const [standingsTableData, setStandingsTableData] = useState([]);
    const [isCreatingNewRound, setIsCreatingNewRound] = useState(false);
    const [isTeamTournament, setIsTeamTournament] = useState(
        isTeamTournamentProp !== undefined ?
            isTeamTournamentProp :
            tournament?.formatSettings?.registrationType === "TEAM"
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if this is a team tournament 
    useEffect(() => {
        setIsTeamTournament(isTeamTournamentProp !== undefined ?
            isTeamTournamentProp :
            tournament?.formatSettings?.registrationType === "TEAM");
    }, [tournament, isTeamTournamentProp]);

    // Initialize bracket and fetch existing data if available
    useEffect(() => {
        if (isInitialized) return;

        const initializeTournamentBracket = async () => {
            if (!tournament) return;

            try {
                setLoading(true);
                setError(null);

                // Initialize the participant mapping for reference when reloading
                const participantMap = {};

                // For individual tournaments
                if (!isTeamTournament && participants) {
                    participants.forEach(participant => {
                        participantMap[participant.id] = {
                            ...participant,
                            isTeam: false
                        };
                    });
                }

                // For team tournaments
                else if (isTeamTournament && tournament.teamParticipants) {
                    tournament.teamParticipants.forEach(teamParticipant => {
                        participantMap[teamParticipant.teamId] = {
                            id: teamParticipant.teamId,
                            name: teamParticipant.team.name,
                            tag: teamParticipant.team.tag,
                            logoUrl: teamParticipant.team.logoUrl,
                            isTeam: true
                        };
                    });
                }

                // Fetch existing bracket data with format parameter to get the correct format
                const response = await fetch(`/api/tournaments/${tournament.id}/bracket?format=SWISS`);

                if (!response.ok) {
                    throw new Error("Failed to fetch bracket data");
                }

                const existingBracket = await response.json();

                if (existingBracket && existingBracket.rounds && existingBracket.rounds.length > 0) {
                    // Restore player objects in the matches using the participant map
                    const processedRounds = existingBracket.rounds.map(round => {
                        return {
                            ...round,
                            matches: round.matches.map(match => {
                                return {
                                    ...match,
                                    player1: match.player1Id ? participantMap[match.player1Id] || null : null,
                                    player2: match.player2Id ? participantMap[match.player2Id] || null : null
                                };
                            })
                        };
                    });

                    setRounds(processedRounds);
                    setCurrentRound(existingBracket.currentRound || 0);

                    // Initialize scores based on match results
                    const scores = {};
                    participants.forEach(participant => {
                        scores[participant.id] = {
                            id: participant.id,
                            name: participant.name,
                            user: participant.user,
                            isTeam: false,
                            wins: 0,
                            losses: 0,
                            draws: 0,
                            points: 0,
                            matchesByRound: {},
                            opponents: []
                        };
                    });

                    // Calculate scores from match results
                    processedRounds.forEach((round, roundIndex) => {
                        round.matches.forEach(match => {
                            if (match.result && match.player1Id) {
                                // Track opponents
                                if (match.player1Id && match.player2Id) {
                                    if (!scores[match.player1Id].opponents.includes(match.player2Id)) {
                                        scores[match.player1Id].opponents.push(match.player2Id);
                                    }

                                    if (!scores[match.player2Id].opponents.includes(match.player1Id)) {
                                        scores[match.player2Id].opponents.push(match.player1Id);
                                    }
                                }

                                // Calculate points based on results
                                if (match.result === 'player1') {
                                    if (scores[match.player1Id]) {
                                        scores[match.player1Id].wins += 1;
                                        scores[match.player1Id].points += 3;
                                        scores[match.player1Id].matchesByRound[roundIndex] = 'win';
                                    }

                                    if (match.player2Id && scores[match.player2Id]) {
                                        scores[match.player2Id].losses += 1;
                                        scores[match.player2Id].matchesByRound[roundIndex] = 'loss';
                                    }
                                } else if (match.result === 'player2') {
                                    if (scores[match.player1Id]) {
                                        scores[match.player1Id].losses += 1;
                                        scores[match.player1Id].matchesByRound[roundIndex] = 'loss';
                                    }

                                    if (match.player2Id && scores[match.player2Id]) {
                                        scores[match.player2Id].wins += 1;
                                        scores[match.player2Id].points += 3;
                                        scores[match.player2Id].matchesByRound[roundIndex] = 'win';
                                    }
                                } else if (match.result === 'draw') {
                                    if (scores[match.player1Id]) {
                                        scores[match.player1Id].draws += 1;
                                        scores[match.player1Id].points += 1;
                                        scores[match.player1Id].matchesByRound[roundIndex] = 'draw';
                                    }

                                    if (match.player2Id && scores[match.player2Id]) {
                                        scores[match.player2Id].draws += 1;
                                        scores[match.player2Id].points += 1;
                                        scores[match.player2Id].matchesByRound[roundIndex] = 'draw';
                                    }
                                }
                            }
                        });
                    });

                    setParticipantScores(scores);
                    updateStandingsTable(scores);


                } else {

                }
            } catch (error) {
                console.error("Error loading Swiss bracket:", error);
                setError(error.message);
            } finally {
                setLoading(false);
                setIsInitialized(true);
            }
        };

        initializeTournamentBracket();
    }, [tournament, participants, isInitialized, isTeamTournament]);

    // Listen for save event
    useEffect(() => {
        const handleSave = () => {
            const bracketData = {
                tournamentId: tournament.id,
                rounds: rounds,
                currentRound: currentRound,
                format: 'SWISS'
            };

            // Add winners if tournament is complete
            if (standingsTableData.length > 0) {
                const winners = [];

                // Top 3 participants/teams get prizes
                for (let i = 0; i < Math.min(3, standingsTableData.length); i++) {
                    const standing = standingsTableData[i];

                    if (isTeamTournament) {
                        winners.push({
                            teamId: standing.id,  // For team tournaments
                            position: i + 1,
                            prizeMoney: calculatePrizeMoney(i + 1)
                        });
                    } else {
                        winners.push({
                            userId: standing.id,  // For individual tournaments
                            position: i + 1,
                            prizeMoney: calculatePrizeMoney(i + 1)
                        });
                    }
                }

                bracketData.winners = winners;
            }

            // Call the parent's save function
            saveBracket(bracketData);
        };

        document.addEventListener('saveSwissBracket', handleSave);

        return () => {
            document.removeEventListener('saveSwissBracket', handleSave);
        };
    }, [tournament, rounds, currentRound, standingsTableData, isTeamTournament, saveBracket]);

    // Calculate prize money based on position
    const calculatePrizeMoney = (position) => {
        const prizePool = tournament.prizePool || 0;

        switch (position) {
            case 1:
                return prizePool * 0.5;
            case 2:
                return prizePool * 0.3;
            case 3:
                return prizePool * 0.2;
            default:
                return 0;
        }
    };

    // Calculate max rounds based on participant count
    const calculateMaxRounds = (count) => {
        return Math.min(Math.ceil(Math.log2(count)), 5);
    };

    // Update the standings table
    const updateStandingsTable = (scores) => {
        const standings = Object.values(scores).map(score => ({
            id: score.id,
            name: score.name,
            tag: score.tag,
            user: score.user,
            logoUrl: score.logoUrl,
            image: score.image,
            isTeam: score.isTeam,
            wins: score.wins,
            losses: score.losses,
            draws: score.draws,
            points: score.points,
            matchesPlayed: score.wins + score.losses + score.draws
        }));

        // Sort by points, then wins
        standings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.draws - a.draws;
        });

        setStandingsTableData(standings);
    };

    const createNewRound = (currentScores) => {
        setIsCreatingNewRound(true);

        try {
            let sortedParticipants = [];

            // Handle first round seeding according to tournament's seedingType
            if (rounds.length === 0) {

                let allParticipants = [];

                if (isTeamTournament && tournament.teamParticipants) {
                    allParticipants = tournament.teamParticipants.map(tp => ({
                        id: tp.teamId,
                        name: tp.team.name,
                        tag: tp.team.tag,
                        logoUrl: tp.team.logoUrl,
                        seedNumber: tp.seedNumber,
                        isTeam: true
                    }));
                } else if (!isTeamTournament && participants) {
                    allParticipants = participants.map(p => ({
                        ...p,
                        isTeam: false
                    }));
                }

                switch (tournament.seedingType) {
                    case 'RANDOM':
                        // For random seeding, shuffle the participants
                        sortedParticipants = [...allParticipants];
                        for (let i = sortedParticipants.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [sortedParticipants[i], sortedParticipants[j]] = [sortedParticipants[j], sortedParticipants[i]];
                        }
                        break;

                    case 'SKILL_BASED':
                        // For skill-based seeding, sort by user's/team's points/rank
                        if (isTeamTournament) {
                            sortedParticipants = [...allParticipants].sort((a, b) => {
                                // Logic for sorting teams by skill - could consider avg team member points
                                return 0;
                            });
                        } else {
                            sortedParticipants = [...allParticipants].sort((a, b) => {
                                const pointsA = a.user?.points || 0;
                                const pointsB = b.user?.points || 0;
                                return pointsB - pointsA;
                            });
                        }
                        break;

                    case 'MANUAL':
                        if (allParticipants.some(p => p.seedNumber)) {
                            sortedParticipants = [...allParticipants].sort((a, b) =>
                                (a.seedNumber || Number.MAX_SAFE_INTEGER) - (b.seedNumber || Number.MAX_SAFE_INTEGER)
                            );
                        } else {
                            sortedParticipants = [...allParticipants];
                        }
                        break;

                    default:
                        sortedParticipants = [...allParticipants];
                }
            } else {
                // sort by current tournament scores
                sortedParticipants = Object.values(currentScores).sort((a, b) => {
                    // Sort by points, then by wins
                    if (b.points !== a.points) return b.points - a.points;
                    return b.wins - a.wins;
                });
            }

            // Create matches for this round
            const newMatches = [];
            const participantsInRound = new Set();

            // For each participant from top to bottom
            for (let i = 0; i < sortedParticipants.length; i++) {
                const participant = sortedParticipants[i];

                // Skip if already matched in this round
                if (participantsInRound.has(participant.id)) continue;

                // Find the highest-ranked opponent this participant hasn't played yet
                let opponentIndex = -1;

                for (let j = i + 1; j < sortedParticipants.length; j++) {
                    const potentialOpponent = sortedParticipants[j];

                    // Skip if already matched in this round
                    if (participantsInRound.has(potentialOpponent.id)) continue;

                    // Skip if these players have already played each other
                    const alreadyPlayed = currentScores[participant.id]?.opponents.includes(potentialOpponent.id);

                    if (!alreadyPlayed) {
                        opponentIndex = j;
                        break;
                    }
                }

                // Create match if opponent found
                if (opponentIndex !== -1) {
                    const opponent = sortedParticipants[opponentIndex];

                    newMatches.push({
                        id: `swiss-match-${rounds.length}-${newMatches.length}`,
                        player1Id: participant.id,
                        player2Id: opponent.id,
                        player1: participant,
                        player2: opponent,
                        result: null,
                        round: rounds.length
                    });

                    participantsInRound.add(participant.id);
                    participantsInRound.add(opponent.id);
                } else {
                    // No opponent found, give a bye
                    newMatches.push({
                        id: `swiss-match-${rounds.length}-${newMatches.length}`,
                        player1Id: participant.id,
                        player2Id: null,
                        player1: participant,
                        player2: null,
                        result: 'player1', // Auto-win for player with bye
                        round: rounds.length
                    });

                    participantsInRound.add(participant.id);

                    // Update scores for player with bye
                    currentScores[participant.id].wins += 1;
                    currentScores[participant.id].points += 3;
                    currentScores[participant.id].matchesByRound[rounds.length] = 'win';
                }
            }

            // Add the new round
            const newRound = {
                id: `swiss-round-${rounds.length}`,
                roundNumber: rounds.length,
                matches: newMatches
            };

            try {
                setRounds([...rounds, newRound]);
                setCurrentRound(rounds.length);
                updateStandingsTable(currentScores);
            } catch (error) {
                console.error("Error creating Swiss round:", error);
            } finally {
                setIsCreatingNewRound(false);
            }
        } catch (error) {
            console.error("Error creating Swiss round:", error);
            setIsCreatingNewRound(false);
        }
    };

    // Handle setting a match result
    const handleMatchResult = (roundIndex, matchIndex, result) => {
        if (viewOnly) return;

        const updatedRounds = JSON.parse(JSON.stringify(rounds));
        const match = updatedRounds[roundIndex].matches[matchIndex];

        // Update match result
        match.result = result;

        // Update scores based on result
        const updatedScores = { ...participantScores };

        const removeOldResult = (playerId, roundNum) => {
            if (!playerId) return;

            const oldResult = updatedScores[playerId]?.matchesByRound[roundNum];

            if (oldResult === 'win') {
                updatedScores[playerId].wins = Math.max(0, updatedScores[playerId].wins - 1);
                updatedScores[playerId].points = Math.max(0, updatedScores[playerId].points - 3);
            } else if (oldResult === 'loss') {
                updatedScores[playerId].losses = Math.max(0, updatedScores[playerId].losses - 1);
            } else if (oldResult === 'draw') {
                updatedScores[playerId].draws = Math.max(0, updatedScores[playerId].draws - 1);
                updatedScores[playerId].points = Math.max(0, updatedScores[playerId].points - 1);
            }
        };

        // Remove old results if updating an existing result
        if (match.result !== null) {
            removeOldResult(match.player1Id, roundIndex);
            removeOldResult(match.player2Id, roundIndex);
        }

        // Add new match result
        if (result === 'player1') {
            if (match.player1Id) {
                updatedScores[match.player1Id].wins += 1;
                updatedScores[match.player1Id].points += 3;
                updatedScores[match.player1Id].matchesByRound[roundIndex] = 'win';
            }

            if (match.player2Id) {
                updatedScores[match.player2Id].losses += 1;
                updatedScores[match.player2Id].matchesByRound[roundIndex] = 'loss';
            }
        } else if (result === 'player2') {
            if (match.player1Id) {
                updatedScores[match.player1Id].losses += 1;
                updatedScores[match.player1Id].matchesByRound[roundIndex] = 'loss';
            }

            if (match.player2Id) {
                updatedScores[match.player2Id].wins += 1;
                updatedScores[match.player2Id].points += 3;
                updatedScores[match.player2Id].matchesByRound[roundIndex] = 'win';
            }
        } else if (result === 'draw') {

            if (match.player1Id) {
                updatedScores[match.player1Id].draws += 1;
                updatedScores[match.player1Id].points += 1;
                updatedScores[match.player1Id].matchesByRound[roundIndex] = 'draw';
            }

            if (match.player2Id) {
                updatedScores[match.player2Id].draws += 1;
                updatedScores[match.player2Id].points += 1;
                updatedScores[match.player2Id].matchesByRound[roundIndex] = 'draw';
            }
        }

        // Track that these players have faced each other
        if (match.player1Id && match.player2Id) {
            if (!updatedScores[match.player1Id].opponents.includes(match.player2Id)) {
                updatedScores[match.player1Id].opponents.push(match.player2Id);
            }

            if (!updatedScores[match.player2Id].opponents.includes(match.player1Id)) {
                updatedScores[match.player2Id].opponents.push(match.player1Id);
            }
        }

        // Update state
        setRounds(updatedRounds);
        setParticipantScores(updatedScores);
        updateStandingsTable(updatedScores);
    };

    // Calculate if all matches in a round are completed
    const isRoundComplete = (roundIndex) => {
        if (!rounds[roundIndex]) return false;

        return rounds[roundIndex].matches.every(match => match.result !== null);
    };

    // Function to determine if we can start a new round
    const canStartNewRound = () => {
        // Check if there are any rounds
        if (rounds.length === 0) return true;

        if (!isRoundComplete(rounds.length - 1)) return false;

        const maxRounds = tournament.formatSettings?.numberOfRounds ||
            calculateMaxRounds(isTeamTournament ?
                tournament.teamParticipants.length :
                participants.length);
        return rounds.length < maxRounds;
    };

    // Function to finalize tournament winners
    const finalizeTournament = () => {
        if (viewOnly) return;

        // Sort standings by points, then wins
        const finalStandings = [...standingsTableData].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.draws - a.draws;
        });

        // Set top 3 positions
        if (finalStandings.length > 0) {
            setTournamentWinner(finalStandings[0]);
        }

        if (finalStandings.length > 1) {
            setRunnerUp(finalStandings[1]);
        }

        if (finalStandings.length > 2) {
            setThirdPlace(finalStandings[2]);
        }

        const event = new CustomEvent('saveSwissBracket');
        document.dispatchEvent(event);
    };

    // Validate image URL to prevent XSS
    const validateImageUrl = (url) => {
        if (!url) return false;
        return (
            (url.startsWith('http://') ||
                url.startsWith('https://')) &&
            !url.includes('javascript:')
        );
    };

    // Render the standings table
    const renderStandingsTable = () => {
        if (standingsTableData.length === 0) {
            return (
                <div className="bg-gray-50 p-6 text-center rounded-lg">
                    <p className="text-gray-500">No standings data available yet.</p>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rank
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Player
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Points
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                W-D-L
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Matches
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {standingsTableData.map((player, index) => {
                            // Get first letter for fallback avatar
                            const firstLetter = player.name?.charAt(0).toUpperCase() || "?";

                            return (
                                <tr key={player.id} className={index < 3 ? "bg-yellow-50" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {index + 1}
                                        {index === 0 && <span className="ml-1">🏆</span>}
                                        {index === 1 && <span className="ml-1">🥈</span>}
                                        {index === 2 && <span className="ml-1">🥉</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Link href={`/user/${player.id}`}>
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 mr-3">
                                                    {player.user?.image && validateImageUrl(player.user.image) ? (
                                                        <Image
                                                            src={player.user.image}
                                                            alt={player.name}
                                                            width={32}
                                                            height={32}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-800 font-medium">
                                                            {firstLetter}
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            <Link href={`/user/${player.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                                {player.name}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {player.points}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {player.wins}-{player.draws}-{player.losses}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {player.matchesPlayed}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // Render a match
    const renderMatch = (match, roundIndex, matchIndex) => {
        const player1 = match.player1;
        const player2 = match.player2;

        return (
            <div
                key={match.id}
                className="border rounded-md overflow-hidden mb-4 bg-white"
            >
                {/* Player 1 */}
                <div className={`p-3 border-b flex items-center justify-between ${match.result === 'player1' ? 'bg-green-50' :
                    match.result === 'player2' ? 'bg-red-50' :
                        match.result === 'draw' ? 'bg-blue-50' : 'bg-white'
                    }`}>
                    <div className="flex items-center">
                        {player1 && player1.isTeam ? (
                            <div className="flex items-center">
                                {player1.logoUrl && validateImageUrl(player1.logoUrl) ? (
                                    <Link href={`/teams/${player1.id}`}>
                                        <div className="w-8 h-8 rounded-full overflow-hidden mr-3">
                                            <Image
                                                src={player1.logoUrl}
                                                alt={player1.name}
                                                width={32}
                                                height={32}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                        <span className="text-blue-800 font-medium">
                                            {player1.tag?.slice(0, 2).toUpperCase() || "T"}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <Link href={`/teams/${player1.id}`} className="font-medium hover:text-blue-600">
                                        {player1.tag ? `[${player1.tag}] ` : ""}{player1.name}
                                    </Link>
                                    {match.result === 'player1' && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                            Winner
                                        </span>
                                    )}
                                    {match.result === 'draw' && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                            Draw
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : player1 ? (
                            <div className="flex items-center">
                                <Link href={`/user/${player1.id}`}>
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 mr-3">
                                        {player1.image && validateImageUrl(player1.image) ? (
                                            <Image
                                                src={player1.image}
                                                alt={player1.name}
                                                width={32}
                                                height={32}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-800 font-medium">
                                                {player1.name?.charAt(0).toUpperCase() || "P"}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                <div>
                                    <Link href={`/user/${player1.id}`} className="font-medium hover:text-blue-600">
                                        {player1.name}
                                    </Link>
                                    {match.result === 'player1' && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                            Winner
                                        </span>
                                    )}
                                    {match.result === 'draw' && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                            Draw
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-400">Bye</span>
                        )}
                    </div>
                </div>

                {/* Player 2 */}
                <div className={`p-3 border-b flex items-center justify-between ${match.result === 'player2' ? 'bg-green-50' :
                    match.result === 'player1' ? 'bg-red-50' :
                        match.result === 'draw' ? 'bg-blue-50' : 'bg-white'
                    }`}>
                    <div className="flex items-center">
                        {player2 && player2.isTeam ? (
                            <div className="flex items-center">
                                {player2.logoUrl && validateImageUrl(player2.logoUrl) ? (
                                    <Link href={`/teams/${player2.id}`}>
                                        <div className="w-8 h-8 rounded-full overflow-hidden mr-3">
                                            <Image
                                                src={player2.logoUrl}
                                                alt={player2.name}
                                                width={32}
                                                height={32}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                        <span className="text-blue-800 font-medium">
                                            {player2.tag?.slice(0, 2).toUpperCase() || "T"}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <Link href={`/teams/${player2.id}`} className="font-medium hover:text-blue-600">
                                        {player2.tag ? `[${player2.tag}] ` : ""}{player2.name}
                                    </Link>
                                    {match.result === 'player2' && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                            Winner
                                        </span>
                                    )}
                                    {match.result === 'draw' && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                            Draw
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : player2 ? (
                            <div className="flex items-center">
                                <Link href={`/user/${player2.id}`}>
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 mr-3">
                                        {player2.image && validateImageUrl(player2.image) ? (
                                            <Image
                                                src={player2.image}
                                                alt={player2.name}
                                                width={32}
                                                height={32}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-800 font-medium">
                                                {player2.name?.charAt(0).toUpperCase() || "P"}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                <div>
                                    <Link href={`/user/${player2.id}`} className="font-medium hover:text-blue-600">
                                        {player2.name}
                                    </Link>
                                    {match.result === 'player2' && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                            Winner
                                        </span>
                                    )}
                                    {match.result === 'draw' && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                            Draw
                                        </span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-400">Bye</span>
                        )}
                    </div>
                </div>

                {/* Match actions */}
                {!viewOnly && match.result === null && player1 && player2 && (
                    <div className="p-3 bg-gray-50 flex justify-between">
                        <button
                            onClick={() => handleMatchResult(roundIndex, matchIndex, 'player1')}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                            {player1.isTeam ? `${player1.tag || player1.name}` : player1.name} Won
                        </button>

                        <button
                            onClick={() => handleMatchResult(roundIndex, matchIndex, 'draw')}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                            Draw
                        </button>

                        <button
                            onClick={() => handleMatchResult(roundIndex, matchIndex, 'player2')}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                            {player2.isTeam ? `${player2.tag || player2.name}` : player2.name} Won
                        </button>
                    </div>
                )}

                {/* Edit result button */}
                {!viewOnly && match.result !== null && player1 && (
                    <div className="p-3 bg-gray-50 flex justify-center">
                        <button
                            onClick={() => handleMatchResult(roundIndex, matchIndex, null)}
                            className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                        >
                            Edit Result
                        </button>
                    </div>
                )}

                {/* Auto win for byes */}
                {!player2 && match.result === 'player1' && (
                    <div className="p-3 bg-green-50 text-center text-green-800 text-sm">
                        {player1 ? (player1.isTeam ? `${player1.tag || player1.name}` : player1.name) : "Player"} wins by default (bye)
                    </div>
                )}
            </div>
        );
    };

    if (!isInitialized) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold mb-4">Tournament Standings</h2>
                {renderStandingsTable()}
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Swiss Tournament Rounds</h2>

                    {!viewOnly && canStartNewRound() && (
                        <button
                            onClick={() => createNewRound(participantScores)}
                            disabled={isCreatingNewRound}
                            className={`px-4 py-2 rounded-md ${isCreatingNewRound
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {isCreatingNewRound ? 'Creating...' : 'Create Next Round'}
                        </button>
                    )}

                    {!viewOnly && rounds.length > 0 && isRoundComplete(rounds.length - 1) && (
                        <button
                            onClick={finalizeTournament}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            Finalize Results
                        </button>
                    )}
                </div>

                {rounds.length === 0 ? (
                    <div className="bg-gray-50 p-6 text-center rounded-lg">
                        <p className="text-gray-500">No rounds have been created yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {rounds.map((round, roundIndex) => (
                            <div key={round.id} className="bg-white p-4 rounded-lg shadow">
                                <h3 className="text-lg font-semibold mb-4">
                                    Round {roundIndex + 1}
                                    {isRoundComplete(roundIndex) && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                            Complete
                                        </span>
                                    )}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {round.matches.map((match, matchIndex) => (
                                        renderMatch(match, roundIndex, matchIndex)
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SwissBracket;