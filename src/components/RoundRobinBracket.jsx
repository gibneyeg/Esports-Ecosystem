"use client";



import React, { useState, useEffect } from 'react';

import { fetchExistingBracket } from '@/utils/bracketApi';



const RoundRobinBracket = ({
    tournament,
    participants,
    setParticipants,
    selectedParticipant,
    setSelectedParticipant,
    setTournamentWinner,
    tournamentWinner,
    setRunnerUp,
    runnerUp,
    setThirdPlace,
    thirdPlace,
    viewOnly,
    saveBracket


}) => {

    const [groups, setGroups] = useState([]);

    const [matches, setMatches] = useState([]);

    const [isLoading, setIsLoading] = useState(true);



    // Get group size from tournament settings or default to 4

    const groupSize = tournament?.formatSettings?.groupSize;

    const resetBracket = () => {
        // Create fresh empty groups
        const numberOfGroups = Math.ceil(participants.length / (groupSize || 4));
        const newGroups = [];

        for (let i = 0; i < numberOfGroups; i++) {
            newGroups.push({
                id: `group-${i + 1}`,
                name: `Group ${String.fromCharCode(65 + i)}`, // Group A, B, C, etc.
                participants: []
            });
        }

        setGroups(newGroups);
        setMatches([]);

        // Reset winner information
        setTournamentWinner(null);
        setRunnerUp(null);
        setThirdPlace(null);
    };
    const handleAssignParticipantToGroup = (participant, groupId) => {
        if (viewOnly) return;

        // Check if participant is already in a group
        let isParticipantInGroup = false;
        const updatedGroups = groups.map(group => {
            // Check if participant is in this group
            const participantIndex = group.participants.findIndex(p => p.id === participant.id);

            if (participantIndex >= 0) {
                isParticipantInGroup = true;

                // If they're already in the target group, do nothing
                if (group.id === groupId) {
                    return group;
                }

                // Remove from current group
                const updatedParticipants = [...group.participants];
                updatedParticipants.splice(participantIndex, 1);

                return {
                    ...group,
                    participants: updatedParticipants
                };
            }

            // If this is the target group, add the participant
            if (group.id === groupId) {
                return {
                    ...group,
                    participants: [...group.participants, {
                        ...participant,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        points: 0,
                        played: 0
                    }]
                };
            }

            return group;
        });

        setGroups(updatedGroups);

        // Regenerate matches for groups that have changed
        regenerateMatches(updatedGroups);
    };


    const regenerateMatches = (updatedGroups) => {
        // First, identify unchanged groups to keep their matches
        const unchangedGroupIds = groups
            .filter(oldGroup => {
                const newGroup = updatedGroups.find(g => g.id === oldGroup.id);
                if (!newGroup) return false;

                // Check if participants are the same
                const oldIds = new Set(oldGroup.participants.map(p => p.id));
                const newIds = new Set(newGroup.participants.map(p => p.id));

                // If counts are different, the group has changed
                if (oldIds.size !== newIds.size) return false;

                // Check if all old participants are in new group
                for (const id of oldIds) {
                    if (!newIds.has(id)) return false;
                }

                return true;
            })
            .map(g => g.id);

        // Keep matches for unchanged groups
        const unchangedMatches = matches.filter(m =>
            unchangedGroupIds.includes(m.groupId)
        );

        // Generate new matches for changed groups
        const newMatches = [];

        updatedGroups.forEach(group => {
            // Skip unchanged groups - we already keep their matches
            if (unchangedGroupIds.includes(group.id)) return;

            const groupParticipants = group.participants;

            if (groupParticipants.length >= 2) {
                for (let j = 0; j < groupParticipants.length; j++) {
                    for (let k = j + 1; k < groupParticipants.length; k++) {
                        const match = {
                            id: `match-${group.id}-${j}-${k}`,
                            groupId: group.id,
                            groupName: group.name,
                            round: Math.floor(newMatches.length / updatedGroups.length) + 1,
                            position: newMatches.length,
                            player1: groupParticipants[j],
                            player2: groupParticipants[k],
                            winner: null,
                            score: null,
                            isDraw: false
                        };
                        newMatches.push(match);
                    }
                }
            }
        });

        // Combine unchanged and new matches
        setMatches([...unchangedMatches, ...newMatches]);
    };

    useEffect(() => {

        const initializeGroups = async () => {
            try {
                setIsLoading(true);

                // Fetch any existing bracket data
                const bracketData = await fetchExistingBracket(tournament.id);
                console.log("Loaded bracket data:", bracketData);

                // Calculate number of groups
                const participantCount = participants.length;
                const numberOfGroups = Math.ceil(participantCount / (groupSize || 4));

                // Create empty groups (no auto-assignment)
                let newGroups = [];
                for (let i = 0; i < numberOfGroups; i++) {
                    newGroups.push({
                        id: `group-${i + 1}`,
                        name: `Group ${String.fromCharCode(65 + i)}`, // Group A, B, C, etc.
                        participants: [] // Start with empty participants
                    });
                }

                let newMatches = [];

                // If we have existing bracket data, restore the groups and matches
                if (bracketData && bracketData.matches && bracketData.matches.length > 0) {
                    // Extract unique groups from the matches
                    const existingGroups = new Set();
                    bracketData.matches.forEach(match => {
                        if (match.groupId) {
                            existingGroups.add(match.groupId);
                        }
                    });

                    // If we have existing groups, use those instead
                    if (existingGroups.size > 0) {
                        newGroups = Array.from(existingGroups).map(groupId => {
                            const groupName = bracketData.matches.find(m => m.groupId === groupId)?.groupName ||
                                `Group ${groupId.slice(-1).toUpperCase()}`;
                            return {
                                id: groupId,
                                name: groupName,
                                participants: []
                            };
                        });
                    }

                    // Identify participants in each group
                    const participantsByGroup = {};
                    bracketData.matches.forEach(match => {
                        if (!match.groupId) return;

                        if (!participantsByGroup[match.groupId]) {
                            participantsByGroup[match.groupId] = new Set();
                        }

                        if (match.player1) {
                            participantsByGroup[match.groupId].add(match.player1.id);
                        }

                        if (match.player2) {
                            participantsByGroup[match.groupId].add(match.player2.id);
                        }
                    });

                    // Assign participants to groups
                    newGroups = newGroups.map(group => {
                        const groupParticipants = [];

                        if (participantsByGroup[group.id]) {
                            participantsByGroup[group.id].forEach(participantId => {
                                const participant = participants.find(p => p.id === participantId);
                                if (participant) {
                                    groupParticipants.push({
                                        ...participant,
                                        wins: 0,
                                        losses: 0,
                                        draws: 0,
                                        points: 0,
                                        played: 0
                                    });
                                }
                            });
                        }

                        return {
                            ...group,
                            participants: groupParticipants
                        };
                    });

                    // Restore matches from saved data
                    bracketData.matches.forEach(savedMatch => {
                        if (!savedMatch.player1 || !savedMatch.player2) return;

                        const player1 = participants.find(p => p.id === savedMatch.player1.id);
                        const player2 = participants.find(p => p.id === savedMatch.player2.id);

                        if (!player1 || !player2) return;

                        // Find the winner participant from our participants array
                        // This ensures we have a complete winner object, not just an ID
                        let winner = null;
                        if (savedMatch.winner) {
                            winner = participants.find(p => p.id === savedMatch.winner.id);
                            console.log(`Found winner: ${winner ? winner.name : 'Not found'} for match between ${player1.name} and ${player2.name}`);
                        }

                        // Determine if it's a draw based on saved data
                        let isDraw = savedMatch.isDraw || false;

                        // If score is "Draw" or "0-0", mark as draw
                        if (savedMatch.score === "Draw" || savedMatch.score === "0-0") {
                            isDraw = true;
                        }

                        // If no winner but score is "1-0", winner is player1
                        if (!winner && savedMatch.score === "1-0") {
                            winner = player1;
                            console.log(`Determined winner from score 1-0: ${player1.name}`);
                        }

                        // If no winner but score is "0-1", winner is player2
                        if (!winner && savedMatch.score === "0-1") {
                            winner = player2;
                            console.log(`Determined winner from score 0-1: ${player2.name}`);
                        }

                        // Create the match with full player and winner objects
                        const match = {
                            id: `match-${savedMatch.groupId}-${savedMatch.position}`,
                            groupId: savedMatch.groupId,
                            groupName: savedMatch.groupName,
                            round: savedMatch.round || 1,
                            position: savedMatch.position,
                            player1: {
                                ...player1,
                                wins: 0,
                                losses: 0,
                                draws: 0,
                                points: 0,
                                played: 0
                            },
                            player2: {
                                ...player2,
                                wins: 0,
                                losses: 0,
                                draws: 0,
                                points: 0,
                                played: 0
                            },
                            winner: winner, // Make sure we use the complete winner object
                            score: savedMatch.score,
                            isDraw: isDraw
                        };

                        newMatches.push(match);
                    });

                    // Log matches for debugging
                    console.log("Reconstructed matches:", newMatches.map(m => ({
                        id: m.id,
                        player1: m.player1.name,
                        player2: m.player2.name,
                        winner: m.winner ? m.winner.name : null,
                        score: m.score,
                        isDraw: m.isDraw
                    })));

                    // Update standings based on matches
                    const updatedGroups = updateGroupStandings(newGroups, newMatches);
                    newGroups = updatedGroups;

                    // Check for tournament winner
                    if (tournament.winners && tournament.winners.length > 0) {
                        const sortedWinners = tournament.winners.sort((a, b) => a.position - b.position);

                        const firstPlaceWinner = sortedWinners.find(w => w.position === 1);
                        if (firstPlaceWinner) {
                            const winner = participants.find(p => p.id === firstPlaceWinner.user.id);
                            if (winner) {
                                setTournamentWinner(winner);
                            }
                        }

                        const secondPlaceWinner = sortedWinners.find(w => w.position === 2);
                        if (secondPlaceWinner) {
                            const runner = participants.find(p => p.id === secondPlaceWinner.user.id);
                            if (runner) {
                                setRunnerUp(runner);
                            }
                        }

                        const thirdPlaceWinner = sortedWinners.find(w => w.position === 3);
                        if (thirdPlaceWinner) {
                            const third = participants.find(p => p.id === thirdPlaceWinner.user.id);
                            if (third) {
                                setThirdPlace(third);
                            }
                        }
                    }
                }

                setGroups(newGroups);
                setMatches(newMatches);
            } catch (error) {
                console.error("Error initializing round robin groups:", error);
            } finally {
                setIsLoading(false);
            }
        };



        initializeGroups();

    }, [tournament, participants, groupSize, setTournamentWinner, setRunnerUp, setThirdPlace]);



    // Update group standings based on match results

    // This is how the updateGroupStandings function worked in your working code:
    const updateGroupStandings = (groups, matches) => {
        // Reset all standings
        const updatedGroups = groups.map(group => ({
            ...group,
            participants: group.participants.map(p => ({
                ...p,
                wins: 0,
                losses: 0,
                draws: 0,
                points: 0,
                played: 0
            }))
        }));

        // Update based on match results
        for (const match of matches) {
            // Skip matches without decided results
            if (!match.winner && !match.isDraw) continue;

            // Make sure we have player data
            if (!match.player1 || !match.player2) continue;

            // Find which group this match belongs to
            let groupIndex = updatedGroups.findIndex(g => g.id === match.groupId);
            if (groupIndex === -1) {
                console.log(`Group not found for match: ${match.id}, groupId: ${match.groupId}`);
                // Try to find the group by checking participants in it
                for (let i = 0; i < updatedGroups.length; i++) {
                    const hasP1 = updatedGroups[i].participants.some(p => p.id === match.player1.id);
                    const hasP2 = updatedGroups[i].participants.some(p => p.id === match.player2.id);
                    if (hasP1 && hasP2) {
                        console.log(`Found match group by participants: ${updatedGroups[i].name}`);
                        // Use this group instead
                        match.groupId = updatedGroups[i].id;
                        match.groupName = updatedGroups[i].name;
                        groupIndex = i;
                        break;
                    }
                }
                if (groupIndex === -1) continue; // Still not found, skip this match
            }

            const group = updatedGroups[groupIndex];

            // Find participants in this group
            const p1Index = group.participants.findIndex(p => p.id === match.player1.id);
            const p2Index = group.participants.findIndex(p => p.id === match.player2.id);

            if (p1Index !== -1 && p2Index !== -1) {
                const updatedParticipants = [...group.participants];

                // Update match played count
                updatedParticipants[p1Index].played++;
                updatedParticipants[p2Index].played++;

                if (match.isDraw) {
                    // Draw: 1 point each
                    updatedParticipants[p1Index].draws++;
                    updatedParticipants[p2Index].draws++;
                    updatedParticipants[p1Index].points++;
                    updatedParticipants[p2Index].points++;
                    console.log(`Match ${match.id}: ${match.player1.name} vs ${match.player2.name} is a draw`);
                } else if (match.winner) {
                    // Win/Loss: 3 points for winner
                    const winnerId = match.winner.id;

                    // Check if score is in "0-1" or "1-0" format and use that to determine winner
                    if (match.score === "1-0" || match.score === "0-1") {
                        const player1Won = match.score === "1-0";
                        if (player1Won) {
                            updatedParticipants[p1Index].wins++;
                            updatedParticipants[p2Index].losses++;
                            updatedParticipants[p1Index].points += 3;
                        } else {
                            updatedParticipants[p2Index].wins++;
                            updatedParticipants[p1Index].losses++;
                            updatedParticipants[p2Index].points += 3;
                        }
                    } else if (updatedParticipants[p1Index].id === winnerId) {
                        updatedParticipants[p1Index].wins++;
                        updatedParticipants[p2Index].losses++;
                        updatedParticipants[p1Index].points += 3;
                        console.log(`Match ${match.id}: ${match.player1.name} won against ${match.player2.name}`);
                    } else if (updatedParticipants[p2Index].id === winnerId) {
                        updatedParticipants[p2Index].wins++;
                        updatedParticipants[p1Index].losses++;
                        updatedParticipants[p2Index].points += 3;
                        console.log(`Match ${match.id}: ${match.player2.name} won against ${match.player1.name}`);
                    } else {
                        console.log(`Match ${match.id}: Winner ID ${winnerId} doesn't match either player`);
                    }
                } else if (match.score) {
                    // If there's a score but no winner or draw flag, try to determine from score
                    if (match.score === "1-0") {
                        updatedParticipants[p1Index].wins++;
                        updatedParticipants[p2Index].losses++;
                        updatedParticipants[p1Index].points += 3;
                    } else if (match.score === "0-1") {
                        updatedParticipants[p2Index].wins++;
                        updatedParticipants[p1Index].losses++;
                        updatedParticipants[p2Index].points += 3;
                    } else if (match.score === "Draw" || match.score === "0-0") {
                        updatedParticipants[p1Index].draws++;
                        updatedParticipants[p2Index].draws++;
                        updatedParticipants[p1Index].points++;
                        updatedParticipants[p2Index].points++;
                    }
                }

                // Sort participants by points (descending)
                updatedParticipants.sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    return b.played - a.played;
                });

                updatedGroups[groupIndex].participants = updatedParticipants;
            } else {
                console.log(`Participants not found in group for match ${match.id}`);
                console.log(`Player1: ${match.player1.name} (${match.player1.id}), Player2: ${match.player2.name} (${match.player2.id})`);
                console.log(`Group ${group.name} participants:`, group.participants.map(p => `${p.name} (${p.id})`));
            }
        }

        return updatedGroups;
    };


    // Get overall tournament rankings across all groups

    const getOverallRankings = (groups) => {

        const allParticipants = groups.flatMap(group => group.participants);



        // Sort by points across all groups

        return [...allParticipants].sort((a, b) => {

            if (b.points !== a.points) return b.points - a.points;

            if (b.wins !== a.wins) return b.wins - a.wins;

            return b.played - a.played;

        });

    };



    const handleMatchResult = (matchId, result) => {
        if (viewOnly) return;

        const updatedMatches = matches.map(match => {
            if (match.id === matchId) {
                if (result === 'draw') {
                    return {
                        ...match,
                        winner: null,
                        isDraw: true,
                        score: 'Draw'
                    };
                } else if (result === 'player1') {
                    return {
                        ...match,
                        winner: match.player1,
                        isDraw: false,
                        score: '1-0'
                    };
                } else if (result === 'player2') {
                    return {
                        ...match,
                        winner: match.player2,
                        isDraw: false,
                        score: '0-1'
                    };
                } else {
                    return {
                        ...match,
                        winner: null,
                        isDraw: false,
                        score: null
                    };
                }
            }
            return match;
        });

        setMatches(updatedMatches);

        // Update group standings
        const updatedGroups = updateGroupStandings(groups, updatedMatches);
        setGroups(updatedGroups);

        // Save the updated bracket immediately
        const event = new CustomEvent('saveRoundRobinBracket');
        document.dispatchEvent(event);
    };



    const handleSave = () => {
        const bracketData = {
            matches: matches.map(match => ({
                player1: { id: match.player1.id },
                player2: { id: match.player2.id },
                winner: match.winner ? { id: match.winner.id } : null,
                isDraw: match.isDraw,
                score: match.score,
                groupId: match.groupId,
                groupName: match.groupName,
                position: match.position,
                round: match.round
            }))
        };

        console.log("Saving bracket data:", bracketData);
        saveBracket(bracketData);
    };



    // Listen for save event

    useEffect(() => {

        const saveHandler = () => handleSave();

        document.addEventListener('saveRoundRobinBracket', saveHandler);



        return () => {

            document.removeEventListener('saveRoundRobinBracket', saveHandler);

        };

    }, [matches, groups]);








    if (isLoading) {

        return <div className="text-center py-8">Loading round robin bracket...</div>;

    }

    const declareWinnerBasedOnRankings = () => {
        const rankings = getOverallRankings(groups);

        if (rankings.length > 0) {
            setTournamentWinner(rankings[0]);

            if (rankings.length > 1) {
                setRunnerUp(rankings[1]);
            }

            if (rankings.length > 2) {
                setThirdPlace(rankings[2]);
            }

            // Save after declaring winner
            const event = new CustomEvent('saveRoundRobinBracket');
            document.dispatchEvent(event);
        }
    };

    return (
        <div className="space-y-8">
            {/* Testing Controls */}
            {!viewOnly && (
                <div className="mb-4 flex space-x-4 items-center">
                    <button
                        onClick={resetBracket}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Reset Bracket (Testing)
                    </button>

                    <button
                        onClick={declareWinnerBasedOnRankings}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        disabled={groups.every(g => g.participants.length === 0)}
                    >
                        Declare Winner Based on Rankings
                    </button>
                </div>
            )}

            {/* Group Assignment UI */}
            {!viewOnly && (
                <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Group Assignment</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Click a participant from the list, then click a group to assign them.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {groups.map(group => (
                            <div
                                key={group.id}
                                className={`border rounded-lg p-3 ${selectedParticipant ? 'bg-green-50 cursor-pointer hover:bg-green-100' : ''
                                    }`}
                                onClick={() => {
                                    if (selectedParticipant && !viewOnly) {
                                        handleAssignParticipantToGroup(selectedParticipant, group.id);
                                        setSelectedParticipant(null);
                                    }
                                }}
                            >
                                <h4 className="font-medium mb-2">{group.name}</h4>
                                {group.participants.length === 0 ? (
                                    <p className="text-gray-400 text-sm">No participants assigned</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {group.participants.map(p => (
                                            <li key={p.id} className="flex justify-between items-center text-sm">
                                                <span>{p.name}</span>
                                                <button
                                                    className="text-red-500 text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const updatedGroups = groups.map(g => {
                                                            if (g.id === group.id) {
                                                                return {
                                                                    ...g,
                                                                    participants: g.participants.filter(participant => participant.id !== p.id)
                                                                };
                                                            }
                                                            return g;
                                                        });
                                                        setGroups(updatedGroups);
                                                        regenerateMatches(updatedGroups);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Group Standings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groups.map(group => (
                    <div key={group.id} className="border rounded-lg shadow-sm">
                        <h3 className="text-lg font-medium bg-blue-50 p-3 border-b">
                            {group.name} Standings
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="p-2 text-left">Position</th>
                                        <th className="p-2 text-left">Participant</th>
                                        <th className="p-2 text-center">Played</th>
                                        <th className="p-2 text-center">W</th>
                                        <th className="p-2 text-center">D</th>
                                        <th className="p-2 text-center">L</th>
                                        <th className="p-2 text-center">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.participants.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-4 text-center text-gray-500">No participants assigned to this group</td>
                                        </tr>
                                    ) : (
                                        group.participants.map((participant, idx) => (
                                            <tr key={participant.id} className="border-b hover:bg-gray-50">
                                                <td className="p-2 font-medium">{idx + 1}</td>
                                                <td className="p-2">
                                                    {participant.seedNumber && (
                                                        <span className="inline-block mr-1 w-5 h-5 text-xs text-center leading-5 bg-gray-100 rounded-full">
                                                            {participant.seedNumber}
                                                        </span>
                                                    )}
                                                    {participant.name}
                                                </td>
                                                <td className="p-2 text-center">{participant.played}</td>
                                                <td className="p-2 text-center">{participant.wins}</td>
                                                <td className="p-2 text-center">{participant.draws}</td>
                                                <td className="p-2 text-center">{participant.losses}</td>
                                                <td className="p-2 text-center font-medium">
                                                    {participant.points}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* Group Matches */}
            <div className="space-y-6">
                {groups.map(group => {
                    // Get matches for this group
                    const groupMatches = matches.filter(match => match.groupId === group.id);

                    // Skip if no matches
                    if (groupMatches.length === 0) {
                        return (
                            <div key={`matches-${group.id}`} className="border rounded-lg shadow-sm">
                                <h3 className="text-lg font-medium bg-blue-50 p-3 border-b">
                                    {group.name} Matches
                                </h3>
                                <div className="p-4 text-center text-gray-500">
                                    {group.participants.length < 2 ?
                                        "Need at least 2 participants to generate matches" :
                                        "No matches available"}
                                </div>
                            </div>
                        );
                    }

                    // Sort matches by round
                    const sortedMatches = [...groupMatches].sort((a, b) => a.round - b.round);

                    // Group matches by round
                    const matchesByRound = {};
                    sortedMatches.forEach(match => {
                        if (!matchesByRound[match.round]) {
                            matchesByRound[match.round] = [];
                        }
                        matchesByRound[match.round].push(match);
                    });

                    return (
                        <div key={`matches-${group.id}`} className="border rounded-lg shadow-sm">
                            <h3 className="text-lg font-medium bg-blue-50 p-3 border-b">
                                {group.name} Matches
                            </h3>

                            <div className="divide-y">
                                {Object.entries(matchesByRound).length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        No matches available
                                    </div>
                                ) : (
                                    Object.entries(matchesByRound).map(([round, roundMatches]) => (
                                        <div key={`round-${round}`} className="p-4">
                                            <h4 className="font-medium mb-3">Round {round}</h4>
                                            <div className="grid gap-3">
                                                {roundMatches.map(match => (
                                                    <div
                                                        key={match.id}
                                                        className="border rounded-md p-3 bg-gray-50"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div
                                                                className={`flex-1 text-right pr-2 ${match.winner?.id === match.player1.id
                                                                    ? "font-bold"
                                                                    : ""
                                                                    }`}
                                                            >
                                                                {match.player1.name}
                                                            </div>

                                                            <div className="px-3 py-1 rounded bg-white border text-center min-w-[60px]">
                                                                {match.score || "vs"}
                                                            </div>

                                                            <div
                                                                className={`flex-1 pl-2 ${match.winner?.id === match.player2.id
                                                                    ? "font-bold"
                                                                    : ""
                                                                    }`}
                                                            >
                                                                {match.player2.name}
                                                            </div>
                                                        </div>

                                                        {!viewOnly && (
                                                            <div className="mt-3 flex justify-center space-x-2">
                                                                <button
                                                                    onClick={() =>
                                                                        handleMatchResult(match.id, "player1")
                                                                    }
                                                                    className={`px-2 py-1 text-xs rounded ${match.winner?.id === match.player1.id
                                                                        ? "bg-blue-500 text-white"
                                                                        : "bg-gray-200"
                                                                        }`}
                                                                >
                                                                    {match.player1.name} Wins
                                                                </button>

                                                                <button
                                                                    onClick={() =>
                                                                        handleMatchResult(match.id, "draw")
                                                                    }
                                                                    className={`px-2 py-1 text-xs rounded ${match.isDraw
                                                                        ? "bg-amber-500 text-white"
                                                                        : "bg-gray-200"
                                                                        }`}
                                                                >
                                                                    Draw
                                                                </button>

                                                                <button
                                                                    onClick={() =>
                                                                        handleMatchResult(match.id, "player2")
                                                                    }
                                                                    className={`px-2 py-1 text-xs rounded ${match.winner?.id === match.player2.id
                                                                        ? "bg-blue-500 text-white"
                                                                        : "bg-gray-200"
                                                                        }`}
                                                                >
                                                                    {match.player2.name} Wins
                                                                </button>

                                                                {(match.winner || match.isDraw) && (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleMatchResult(match.id, "reset")
                                                                        }
                                                                        className="px-2 py-1 text-xs rounded bg-red-100 text-red-700"
                                                                    >
                                                                        Reset
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

}





export default RoundRobinBracket;