
/**
 * Fetches Swiss tournament bracket data for a given tournament
 * @param {string} tournamentId - The ID of the tournament
 * @returns {Promise<Object>} - Returns the bracket data
 */
export const fetchSwissBracket = async (tournamentId) => {
    try {
        const response = await fetch(`/api/tournaments/${tournamentId}/bracket?format=SWISS`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Swiss bracket data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching Swiss bracket:', error);
        return null;
    }
};

/**
 * Prepares Swiss bracket data for saving
 * @param {Array} rounds - Array of rounds
 * @param {number} currentRound - Current active round number
 * @param {Object} standingsData - Current tournament standings
 * @returns {Object} - Formatted data for save
 */
export const prepareSwissBracketForSave = (rounds, currentRound, standingsData) => {
    // Extract winners from standings
    let winners = [];

    if (standingsData && standingsData.length >= 3) {
        winners = [
            { userId: standingsData[0].id, position: 1 },
            { userId: standingsData[1].id, position: 2 },
            { userId: standingsData[2].id, position: 3 }
        ];
    }

    return {
        format: 'SWISS',
        rounds: rounds,
        currentRound: currentRound,
        winners: winners
    };
};

/**
 * Creates pairings for a Swiss round
 * @param {Array} participants - Tournament participants
 * @param {Object} scores - Current scores for all participants
 * @param {Array} previousRounds - Previously played rounds
 * @returns {Array} - Array of match pairings
 */
export const createSwissPairings = (participants, scores, previousRounds) => {
    // Sort participants by score
    const sortedParticipants = [...participants].sort((a, b) => {
        const scoreA = scores[a.id] || { points: 0, wins: 0 };
        const scoreB = scores[b.id] || { points: 0, wins: 0 };

        // Sort by points, then by wins
        if (scoreB.points !== scoreA.points) return scoreB.points - scoreA.points;
        return scoreB.wins - scoreA.wins;
    });

    // Create matches for this round
    const matches = [];
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
            let alreadyPlayed = false;
            for (const round of previousRounds) {
                for (const match of round.matches) {
                    if ((match.player1Id === participant.id && match.player2Id === potentialOpponent.id) ||
                        (match.player1Id === potentialOpponent.id && match.player2Id === participant.id)) {
                        alreadyPlayed = true;
                        break;
                    }
                }
                if (alreadyPlayed) break;
            }

            if (!alreadyPlayed) {
                opponentIndex = j;
                break;
            }
        }

        // Create match if opponent found
        if (opponentIndex !== -1) {
            const opponent = sortedParticipants[opponentIndex];

            matches.push({
                player1Id: participant.id,
                player2Id: opponent.id,
                player1: participant,
                player2: opponent,
                result: null
            });

            participantsInRound.add(participant.id);
            participantsInRound.add(opponent.id);
        } else {
            // No opponent found, give a bye
            matches.push({
                player1Id: participant.id,
                player2Id: null,
                player1: participant,
                player2: null,
                result: 'player1' // Auto-win for player with bye
            });

            participantsInRound.add(participant.id);
        }
    }

    return matches;
};

/**
 * Calculate final standings from Swiss tournament results
 * @param {Array} participants - Tournament participants
 * @param {Object} scores - Final scores for all participants
 * @returns {Array} - Sorted array of final standings
 */
export const calculateSwissStandings = (participants, scores) => {
    const standings = participants.map(participant => {
        const score = scores[participant.id] || { wins: 0, losses: 0, draws: 0, points: 0 };
        return {
            id: participant.id,
            name: participant.name,
            wins: score.wins,
            losses: score.losses,
            draws: score.draws,
            points: score.points,
            matchesPlayed: score.wins + score.losses + score.draws
        };
    });

    // Sort by points, then wins, then draws
    standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.draws - a.draws;
    });

    return standings;
};