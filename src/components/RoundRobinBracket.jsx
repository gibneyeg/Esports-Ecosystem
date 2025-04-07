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
    const [thirdPlaceCandidates] = useState([]);
    const [showTiebreakModal, setShowTiebreakModal] = useState(false);
    const [bracketGenerated, setBracketGenerated] = useState(false);

    const [tiebreakerMatches, setTiebreakerMatches] = useState([]);
    const [tiebreakerModalOpen, setTiebreakerModalOpen] = useState(false);
    const [tiedParticipants, setTiedParticipants] = useState([]);
    const [tiebreakerStage, setTiebreakerStage] = useState(null);

    // Get group size from tournament settings 
    const groupSize = tournament?.formatSettings?.groupSize;

    const resetBracket = () => {
        const numberOfGroups = Math.ceil(participants.length / (groupSize || 4));
        const newGroups = [];

        for (let i = 0; i < numberOfGroups; i++) {
            newGroups.push({
                id: `group-${i + 1}`,
                name: `Group ${String.fromCharCode(65 + i)}`,
                participants: []
            });
        }

        setGroups(newGroups);
        setMatches([]);
        setTiebreakerMatches([]);
        setTiebreakerModalOpen(false);
        setTiedParticipants([]);
        setTiebreakerStage(null);
        setBracketGenerated(false);

        setTournamentWinner(null);
        setRunnerUp(null);
        setThirdPlace(null);
    };

    // Function to randomly assign participants to groups
    const randomizeParticipants = () => {
        if (viewOnly || bracketGenerated) return;

        const numberOfGroups = Math.ceil(participants.length / (groupSize || 4));
        let newGroups = [];

        // Create groups
        for (let i = 0; i < numberOfGroups; i++) {
            newGroups.push({
                id: `group-${i + 1}`,
                name: `Group ${String.fromCharCode(65 + i)}`,
                participants: []
            });
        }

        // Shuffle participants
        const shuffledParticipants = [...participants];
        for (let i = shuffledParticipants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
        }

        // Distribute participants among groups
        shuffledParticipants.forEach((participant, index) => {
            const groupIndex = index % numberOfGroups;
            newGroups[groupIndex].participants.push({
                ...participant,
                wins: 0,
                losses: 0,
                draws: 0,
                points: 0,
                played: 0
            });
        });

        setGroups(newGroups);
        generateMatchesForGroups(newGroups);
        setBracketGenerated(true);
    };

    // Generate matches for all groups
    const generateMatchesForGroups = (groups) => {
        const newMatches = [];

        groups.forEach(group => {
            const groupParticipants = group.participants;

            if (groupParticipants.length >= 2) {
                for (let j = 0; j < groupParticipants.length; j++) {
                    for (let k = j + 1; k < groupParticipants.length; k++) {
                        const match = {
                            id: `match-${group.id}-${j}-${k}`,
                            groupId: group.id,
                            groupName: group.name,
                            round: Math.floor(newMatches.length / groups.length) + 1,
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

        setMatches(newMatches);
    };

    // Handle assigning participants to groups
    const handleAssignParticipantToGroup = (participant, groupId) => {
        if (viewOnly) return;

        let isParticipantInGroup = false;
        const updatedGroups = groups.map(group => {
            const participantIndex = group.participants.findIndex(p => p.id === participant.id);

            if (participantIndex >= 0) {
                isParticipantInGroup = true;

                if (group.id === groupId) {
                    return group;
                }

                const updatedParticipants = [...group.participants];
                updatedParticipants.splice(participantIndex, 1);

                return {
                    ...group,
                    participants: updatedParticipants
                };
            }

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

        regenerateMatches(updatedGroups);
    };

    // Regenerate matches when group composition changes
    const regenerateMatches = (updatedGroups) => {
        const unchangedGroupIds = groups
            .filter(oldGroup => {
                const newGroup = updatedGroups.find(g => g.id === oldGroup.id);
                if (!newGroup) return false;

                const oldIds = new Set(oldGroup.participants.map(p => p.id));
                const newIds = new Set(newGroup.participants.map(p => p.id));

                if (oldIds.size !== newIds.size) return false;

                for (const id of oldIds) {
                    if (!newIds.has(id)) return false;
                }

                return true;
            })
            .map(g => g.id);

        const unchangedMatches = matches.filter(m =>
            unchangedGroupIds.includes(m.groupId)
        );

        const newMatches = [];

        updatedGroups.forEach(group => {
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

        setMatches([...unchangedMatches, ...newMatches]);
    };

    useEffect(() => {
        const isInitialized = groups.length > 0 && matches.length > 0;
        let isMounted = true;

        if (isInitialized) return;

        if (tournament?.status === "COMPLETED" && !tournamentWinner) {
            const winnerObj = participants.find(p => p.id === tournament.winnerId);
            if (winnerObj) setTournamentWinner(winnerObj);
        }

        const initializeTournament = async () => {
            try {
                setIsLoading(true);

                const bracketData = await fetchExistingBracket(tournament.id);

                const participantCount = participants.length;
                const numberOfGroups = Math.ceil(participantCount / (groupSize || 4));

                let newGroups = [];
                for (let i = 0; i < numberOfGroups; i++) {
                    newGroups.push({
                        id: `group-${i + 1}`,
                        name: `Group ${String.fromCharCode(65 + i)}`,
                        participants: []
                    });
                }

                let newMatches = [];

                // If we have existing bracket data, restore the groups and matches
                if (bracketData && bracketData.matches && bracketData.matches.length > 0) {
                    const existingGroups = new Set();
                    bracketData.matches.forEach(match => {
                        if (match.groupId && match.groupId !== 'tiebreaker') {
                            existingGroups.add(match.groupId);
                        }
                    });

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

                    const participantsByGroup = {};
                    bracketData.matches.forEach(match => {
                        if (!match.groupId || match.groupId === 'tiebreaker') return;

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

                    // Restore regular matches from saved data
                    const regularMatches = bracketData.matches.filter(m => m.groupId !== 'tiebreaker');
                    regularMatches.forEach(savedMatch => {
                        if (!savedMatch.player1 || !savedMatch.player2) return;

                        const player1 = participants.find(p => p.id === savedMatch.player1.id);
                        const player2 = participants.find(p => p.id === savedMatch.player2.id);

                        if (!player1 || !player2) return;

                        let winner = null;
                        if (savedMatch.winner) {
                            winner = participants.find(p => p.id === savedMatch.winner.id);
                        }

                        let isDraw = savedMatch.isDraw || false;

                        if (savedMatch.score === "Draw" || savedMatch.score === "0-0") {
                            isDraw = true;
                        }

                        // If no winner but score is "1-0", winner is player1
                        if (!winner && savedMatch.score === "1-0") {
                            winner = player1;
                        }

                        // If no winner but score is "0-1", winner is player2
                        if (!winner && savedMatch.score === "0-1") {
                            winner = player2;
                        }

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
                            winner: winner,
                            score: savedMatch.score,
                            isDraw: isDraw
                        };

                        newMatches.push(match);
                    });

                    // Check for tiebreaker matches
                    const tiebreakerMatches = bracketData.matches.filter(match =>
                        match.groupId === 'tiebreaker'
                    );

                    if (tiebreakerMatches.length > 0) {
                        // Find which tiebreaker stage this was
                        const tiebreakerName = tiebreakerMatches[0].groupName || '';
                        const stage = tiebreakerName.toLowerCase().includes('first') ? 'first' :
                            tiebreakerName.toLowerCase().includes('second') ? 'second' : 'third';

                        setTiebreakerStage(stage);

                        const restoredTiebreakerMatches = tiebreakerMatches.map(savedMatch => {
                            const player1 = participants.find(p => p.id === savedMatch.player1.id);
                            const player2 = participants.find(p => p.id === savedMatch.player2.id);

                            if (!player1 || !player2) return null;

                            let winner = null;
                            if (savedMatch.winner) {
                                winner = participants.find(p => p.id === savedMatch.winner.id);
                            }

                            return {
                                id: `tiebreaker-${savedMatch.round}-${savedMatch.position}`,
                                player1,
                                player2,
                                winner,
                                score: savedMatch.score,
                                isDraw: savedMatch.isDraw || false,
                                isTiebreaker: true
                            };
                        }).filter(Boolean);

                        if (restoredTiebreakerMatches.length > 0) {
                            setTiebreakerMatches(restoredTiebreakerMatches);

                            // Get all unique participants involved in tiebreakers
                            const participantIds = new Set();
                            restoredTiebreakerMatches.forEach(match => {
                                participantIds.add(match.player1.id);
                                participantIds.add(match.player2.id);
                            });

                            const restoredTiedParticipants = Array.from(participantIds)
                                .map(id => participants.find(p => p.id === id))
                                .filter(Boolean);

                            setTiedParticipants(restoredTiedParticipants);
                        }
                    }

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

                    setBracketGenerated(true);
                } else if (tournament.seedingType === 'RANDOM') {
                    // If no existing bracket and seeding type is RANDOM, automatically create random groups
                    // Shuffle participants
                    const shuffledParticipants = [...participants];
                    for (let i = shuffledParticipants.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
                    }

                    // Distribute participants among groups
                    shuffledParticipants.forEach((participant, index) => {
                        const groupIndex = index % numberOfGroups;
                        newGroups[groupIndex].participants.push({
                            ...participant,
                            wins: 0,
                            losses: 0,
                            draws: 0,
                            points: 0,
                            played: 0
                        });
                    });

                    // Generate matches for the randomly assigned groups
                    newGroups.forEach(group => {
                        const groupParticipants = group.participants;

                        if (groupParticipants.length >= 2) {
                            for (let j = 0; j < groupParticipants.length; j++) {
                                for (let k = j + 1; k < groupParticipants.length; k++) {
                                    const match = {
                                        id: `match-${group.id}-${j}-${k}`,
                                        groupId: group.id,
                                        groupName: group.name,
                                        round: Math.floor(newMatches.length / newGroups.length) + 1,
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

                    setBracketGenerated(true);
                }

                // Check if component is still mounted before updating state
                if (isMounted) {
                    setGroups(newGroups);
                    setMatches(newMatches);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Error initializing round robin groups:", error);
                // Check if component is still mounted before updating state
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeTournament();

        // Cleanup function - properly references the isMounted variable 
        return () => {
            isMounted = false;
        };
    }, [tournament, participants, groupSize, setTournamentWinner, setRunnerUp, setThirdPlace]);

    // Update group standings based on match results
    const updateGroupStandings = (groups, matches) => {
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
            if (!match.winner && !match.isDraw) continue;

            if (!match.player1 || !match.player2) continue;

            let groupIndex = updatedGroups.findIndex(g => g.id === match.groupId);
            if (groupIndex === -1) {
                for (let i = 0; i < updatedGroups.length; i++) {
                    const hasP1 = updatedGroups[i].participants.some(p => p.id === match.player1.id);
                    const hasP2 = updatedGroups[i].participants.some(p => p.id === match.player2.id);
                    if (hasP1 && hasP2) {
                        match.groupId = updatedGroups[i].id;
                        match.groupName = updatedGroups[i].name;
                        groupIndex = i;
                        break;
                    }
                }
                if (groupIndex === -1) continue;
            }

            const group = updatedGroups[groupIndex];

            const p1Index = group.participants.findIndex(p => p.id === match.player1.id);
            const p2Index = group.participants.findIndex(p => p.id === match.player2.id);

            if (p1Index !== -1 && p2Index !== -1) {
                const updatedParticipants = [...group.participants];

                updatedParticipants[p1Index].played++;
                updatedParticipants[p2Index].played++;

                if (match.isDraw) {
                    updatedParticipants[p1Index].draws++;
                    updatedParticipants[p2Index].draws++;
                    updatedParticipants[p1Index].points++;
                    updatedParticipants[p2Index].points++;
                } else if (match.winner) {
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
                    } else if (updatedParticipants[p2Index].id === winnerId) {
                        updatedParticipants[p2Index].wins++;
                        updatedParticipants[p1Index].losses++;
                        updatedParticipants[p2Index].points += 3;
                    } else {
                    }
                } else if (match.score) {
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

                updatedParticipants.sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    return b.played - a.played;
                });

                updatedGroups[groupIndex].participants = updatedParticipants;
            } else {

            }
        }

        return updatedGroups;
    };

    // Helper function to determine head-to-head winner
    const getHeadToHeadWinner = (participantA, participantB) => {
        const directMatches = matches.filter(match =>
            (match.player1.id === participantA.id && match.player2.id === participantB.id) ||
            (match.player1.id === participantB.id && match.player2.id === participantA.id)
        );

        if (directMatches.length === 0) return 0;

        // Count wins for each participant
        let aWins = 0;
        let bWins = 0;

        directMatches.forEach(match => {
            if (match.isDraw) return;

            if (match.winner) {
                if (match.winner.id === participantA.id) aWins++;
                if (match.winner.id === participantB.id) bWins++;
            } else if (match.score === "1-0") {
                // Player1 won
                if (match.player1.id === participantA.id) aWins++;
                if (match.player1.id === participantB.id) bWins++;
            } else if (match.score === "0-1") {
                // Player2 won
                if (match.player2.id === participantA.id) aWins++;
                if (match.player2.id === participantB.id) bWins++;
            }
        });

        if (aWins > bWins) return -1;
        if (bWins > aWins) return 1;
        return 0;
    };

    // Get overall tournament rankings across all groups
    const getOverallRankings = (groups) => {
        const allParticipants = groups.flatMap(group => group.participants);

        // Sort by points across all groups
        const sortedParticipants = [...allParticipants].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;

            if (b.wins !== a.wins) return b.wins - a.wins;

            const headToHead = getHeadToHeadWinner(a, b);
            if (headToHead !== 0) return headToHead;

            if (b.played !== a.played) return b.played - a.played;

            return 0;
        });

        const rankedParticipants = [];
        let currentRank = 1;
        let currentPoints = -1;
        let currentWins = -1;
        let participantsAtCurrentRank = [];

        sortedParticipants.forEach((participant, index) => {
            if (index === 0 ||
                (participant.points === currentPoints && participant.wins === currentWins)) {
                participantsAtCurrentRank.push(participant);
            } else {
                rankedParticipants.push({
                    rank: currentRank,
                    participants: participantsAtCurrentRank
                });

                currentRank = rankedParticipants.length + 1;
                participantsAtCurrentRank = [participant];
            }

            currentPoints = participant.points;
            currentWins = participant.wins;
        });


        if (participantsAtCurrentRank.length > 0) {
            rankedParticipants.push({
                rank: currentRank,
                participants: participantsAtCurrentRank
            });
        }

        return {
            flatRankings: sortedParticipants,
            tieredRankings: rankedParticipants
        };
    };
    // Function to detect ties and generate tiebreaker matches
    const generateTiebreakerMatches = () => {
        const { flatRankings } = getOverallRankings(groups);

        // First, determine who are the top 3 by points
        let first = null, second = null, third = null;
        let thirdPoints = 0;

        if (flatRankings.length > 0) {
            first = flatRankings[0];
            if (flatRankings.length > 1) {
                // If second has same points as first, they're tied for first
                if (flatRankings[1].points === first.points) {

                    const firstPlaceTied = flatRankings.filter(p => p.points === first.points);
                    setTiedParticipants(firstPlaceTied);
                    setTiebreakerStage('first');
                    createTiebreakerMatches(firstPlaceTied);
                    setTiebreakerModalOpen(true);
                    return;
                }

                second = flatRankings[1];
                if (flatRankings.length > 2) {
                    // If third has same points as second, they're tied for second
                    if (flatRankings[2].points === second.points) {

                        const secondPlaceTied = flatRankings.filter(p => p.points === second.points);
                        setTiedParticipants(secondPlaceTied);
                        setTiebreakerStage('second');
                        createTiebreakerMatches(secondPlaceTied);
                        setTiebreakerModalOpen(true);
                        return;
                    }

                    third = flatRankings[2];
                    thirdPoints = third.points;

                    // Find all participants with the same points as third place
                    const thirdPlaceTied = flatRankings.filter(p => p.points === thirdPoints);


                    if (thirdPlaceTied.length > 1) {
                        setTiedParticipants(thirdPlaceTied);
                        setTiebreakerStage('third');
                        createTiebreakerMatches(thirdPlaceTied);
                        setTiebreakerModalOpen(true);

                        // Save the tiebreaker state immediately
                        setTimeout(() => {
                            const event = new CustomEvent('saveRoundRobinBracket');
                            document.dispatchEvent(event);
                        }, 500);

                        return;
                    }
                }
            }
        }

        declareWinnerBasedOnRankings();
    };

    // Create round robin tiebreaker matches between tied participants
    const createTiebreakerMatches = (participants) => {
        if (participants.length < 2) return;

        const newMatches = [];

        // Create a mini round robin for the tied participants
        for (let i = 0; i < participants.length; i++) {
            for (let j = i + 1; j < participants.length; j++) {
                newMatches.push({
                    id: `tiebreaker-${i}-${j}`,
                    player1: participants[i],
                    player2: participants[j],
                    winner: null,
                    isDraw: false,
                    score: null,
                    isTiebreaker: true
                });
            }
        }

        setTiebreakerMatches(newMatches);
    };


    const handleTiebreakerResult = (matchId, result) => {
        const updatedMatches = tiebreakerMatches.map(match => {
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

        setTiebreakerMatches(updatedMatches);


        const event = new CustomEvent('saveRoundRobinBracket');
        document.dispatchEvent(event);
    };

    // Calculate tiebreaker standings
    const getTiebreakerStandings = () => {
        const standingsMap = {};


        tiedParticipants.forEach(p => {
            standingsMap[p.id] = {
                participant: p,
                wins: 0,
                draws: 0,
                losses: 0,
                points: 0,
                played: 0
            };
        });

        // Update standings based on match results
        tiebreakerMatches.forEach(match => {

            if (!match.winner && !match.isDraw) return;

            const p1Id = match.player1.id;
            const p2Id = match.player2.id;

            // Update matches played
            standingsMap[p1Id].played++;
            standingsMap[p2Id].played++;

            if (match.isDraw) {
                standingsMap[p1Id].draws++;
                standingsMap[p2Id].draws++;
                standingsMap[p1Id].points++;
                standingsMap[p2Id].points++;
            } else if (match.winner) {
                const winnerId = match.winner.id;
                const loserId = winnerId === p1Id ? p2Id : p1Id;

                standingsMap[winnerId].wins++;
                standingsMap[winnerId].points += 3;

                standingsMap[loserId].losses++;
            }
        });

        // Convert to array and sort
        const standings = Object.values(standingsMap).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.played - a.played;
        });

        return standings;
    };

    // Finalize tiebreaker results
    const finalizeTiebreaker = () => {
        const standings = getTiebreakerStandings();

        const allMatchesComplete = tiebreakerMatches.every(
            match => match.winner || match.isDraw
        );

        if (!allMatchesComplete) {
            alert("Please complete all tiebreaker matches before finalizing results");
            return;
        }

        // Handle based on which position we're breaking ties for
        if (tiebreakerStage === 'first') {
            if (standings.length > 0) {
                setTournamentWinner(standings[0].participant);

                if (standings.length > 1) {
                    setRunnerUp(standings[1].participant);

                    if (standings.length > 2) {
                        setThirdPlace(standings[2].participant);
                    }
                }
            }
        } else if (tiebreakerStage === 'second') {
            if (standings.length > 0) {
                setRunnerUp(standings[0].participant);

                if (standings.length > 1) {
                    setThirdPlace(standings[1].participant);
                }
            }
        } else if (tiebreakerStage === 'third') {
            if (standings.length > 0) {
                setThirdPlace(standings[0].participant);
            }
        }

        setTiebreakerModalOpen(false);

        const event = new CustomEvent('saveRoundRobinBracket');
        document.dispatchEvent(event);
    };
    // Handle match result (win, loss, draw)
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

        const event = new CustomEvent('saveRoundRobinBracket');
        document.dispatchEvent(event);
    };

    // Save bracket data
    const handleSave = () => {
        const allMatches = [
            ...matches,
            ...tiebreakerMatches.map(match => ({
                ...match,
                groupId: 'tiebreaker',
                groupName: `${tiebreakerStage === 'first' ? 'First' : tiebreakerStage === 'second' ? 'Second' : 'Third'} Place Tiebreaker`,
                position: parseInt(match.id.split('-')[2]),
                round: parseInt(match.id.split('-')[1]) + 1
            }))
        ];

        const bracketData = {
            matches: allMatches.map(match => ({
                player1: { id: match.player1.id },
                player2: { id: match.player2.id },
                winner: match.winner ? { id: match.winner.id } : null,
                isDraw: match.isDraw,
                score: match.score,
                groupId: match.groupId || 'tiebreaker',
                groupName: match.groupName || 'Tiebreaker',
                position: match.position || 0,
                round: match.round || 1
            }))
        };

        saveBracket(bracketData);
    };

    const declareWinnerBasedOnRankings = () => {
        const { tieredRankings } = getOverallRankings(groups);

        if (tieredRankings.length > 0) {
            // Handle first place
            if (tieredRankings[0].participants.length === 1) {
                setTournamentWinner(tieredRankings[0].participants[0]);
            } else {
                // Handle tie for first place
                setTournamentWinner(tieredRankings[0].participants[0]);
                setRunnerUp(tieredRankings[0].participants[1]);

                if (tieredRankings[0].participants.length > 2) {
                    setThirdPlace(tieredRankings[0].participants[2]);
                }

                alert(`Note: There is a ${tieredRankings[0].participants.length}-way tie for first place. Using top participants for positions.`);
            }

            // Handle second place if first place wasn't tied
            if (tieredRankings[0].participants.length === 1 && tieredRankings.length > 1) {
                if (tieredRankings[1].participants.length > 0) {
                    setRunnerUp(tieredRankings[1].participants[0]);
                }

                // Handle third place
                if (tieredRankings[1].participants.length > 1) {
                    setThirdPlace(tieredRankings[1].participants[1]);
                } else if (tieredRankings.length > 2 && tieredRankings[2].participants.length > 0) {
                    setThirdPlace(tieredRankings[2].participants[0]);
                }
            }

            // Save the results
            const event = new CustomEvent('saveRoundRobinBracket');
            document.dispatchEvent(event);
        }
    };

    const handleThirdPlaceSelection = (selectedParticipant) => {
        setThirdPlace(selectedParticipant);
        setShowTiebreakModal(false);

        const event = new CustomEvent('saveRoundRobinBracket');
        document.dispatchEvent(event);
    };

    // Listen for save event
    useEffect(() => {
        const saveHandler = () => handleSave();
        document.addEventListener('saveRoundRobinBracket', saveHandler);

        return () => {
            document.removeEventListener('saveRoundRobinBracket', saveHandler);
        };
    }, [matches, groups, tiebreakerMatches, tiebreakerStage]);

    const renderTiebreakerModal = () => {
        if (!tiebreakerModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4">
                        {tiebreakerStage === 'first'
                            ? 'First Place Tiebreaker'
                            : tiebreakerStage === 'second'
                                ? 'Second Place Tiebreaker'
                                : 'Third Place Tiebreaker'}
                    </h3>

                    <p className="mb-4">
                        There is a {tiedParticipants.length}-way tie for
                        {tiebreakerStage === 'first'
                            ? ' first'
                            : tiebreakerStage === 'second'
                                ? ' second'
                                : ' third'} place.
                        Play the following tiebreaker matches to determine the final position.
                    </p>

                    {/* Tiebreaker Standings */}
                    <div className="border rounded-lg shadow-sm mb-6">
                        <h4 className="text-lg font-medium bg-blue-50 p-3 border-b">
                            Tiebreaker Standings
                        </h4>
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
                                    {getTiebreakerStandings().map((standing, idx) => (
                                        <tr key={standing.participant.id} className="border-b hover:bg-gray-50">
                                            <td className="p-2 font-medium">{idx + 1}</td>
                                            <td className="p-2">{standing.participant.name}</td>
                                            <td className="p-2 text-center">{standing.played}</td>
                                            <td className="p-2 text-center">{standing.wins}</td>
                                            <td className="p-2 text-center">{standing.draws}</td>
                                            <td className="p-2 text-center">{standing.losses}</td>
                                            <td className="p-2 text-center font-medium">
                                                {standing.points}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tiebreaker Matches */}
                    <div className="border rounded-lg shadow-sm mb-6">
                        <h4 className="text-lg font-medium bg-blue-50 p-3 border-b">
                            Tiebreaker Matches
                        </h4>
                        <div className="p-4 grid gap-3">
                            {tiebreakerMatches.map(match => (
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

                                    <div className="mt-3 flex justify-center space-x-2">
                                        <button
                                            onClick={() =>
                                                handleTiebreakerResult(match.id, "player1")
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
                                                handleTiebreakerResult(match.id, "draw")
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
                                                handleTiebreakerResult(match.id, "player2")
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
                                                    handleTiebreakerResult(match.id, "reset")
                                                }
                                                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setTiebreakerModalOpen(false)}
                            className="px-4 py-2 border rounded bg-gray-100 hover:bg-gray-200"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={finalizeTiebreaker}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Finalize Results
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    if (isLoading) {
        return <div className="text-center py-8">Loading round robin bracket...</div>;
    }

    return (
        <div className="space-y-8">
            {!viewOnly && (
                <div className="mb-4 flex space-x-4 items-center">
                    <button
                        onClick={resetBracket}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Reset Bracket
                    </button>

                    {tournament.seedingType === 'RANDOM' && !bracketGenerated && (
                        <button
                            onClick={randomizeParticipants}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Generate Random Groups
                        </button>
                    )}

                    <button
                        onClick={generateTiebreakerMatches}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        disabled={groups.every(g => g.participants.length === 0)}
                    >
                        Declare Winner Based on Rankings
                    </button>
                </div>
            )}

            {/* Random Seeding Notice */}
            {tournament.seedingType === 'RANDOM' && !bracketGenerated && !viewOnly && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">Random Seeding</h3>
                    <p className="text-yellow-700 mb-4">
                        This tournament uses random seeding. Click the "Generate Random Groups" button above
                        to automatically assign participants to groups randomly.
                    </p>
                </div>
            )}

            {/* Group Assignment UI */}
            {!viewOnly && tournament.seedingType !== 'RANDOM' && (
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

            {renderTiebreakerModal()}

            {/* Third Place Tiebreaker Modal */}
            {showTiebreakModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                        <h3 className="text-xl font-bold mb-4">Third Place Tiebreaker</h3>
                        <p className="mb-4">
                            There is a {thirdPlaceCandidates.length}-way tie for third place.
                            Please select one participant:
                        </p>
                        <div className="space-y-2 mb-6">
                            {thirdPlaceCandidates.map((participant) => (
                                <button
                                    key={participant.id}
                                    onClick={() => handleThirdPlaceSelection(participant)}
                                    className="w-full text-left p-3 border rounded hover:bg-blue-50"
                                >
                                    {participant.name} (W: {participant.wins}, D: {participant.draws}, L: {participant.losses}, Pts: {participant.points})
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoundRobinBracket;