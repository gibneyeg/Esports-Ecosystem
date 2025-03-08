// Format raw participant data for use in the bracket

export const initializeParticipants = (rawParticipants) => {

    if (!rawParticipants || !Array.isArray(rawParticipants)) {

        return [];

    }


    return rawParticipants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.username || p.user.email?.split('@')[0] || 'Anonymous',
        participantId: p.id,
        isPlaced: false,
        seedNumber: p.seedNumber || null
    }));
};

// Update a participant's placement status
export const updateParticipantPlacement = (participants, participantId, isPlaced) => {
    return participants.map(p => {
        if (p.id === participantId) {
            return { ...p, isPlaced };
        }
        return p;
    });
};

// Load participants from existing bracket data
export const loadParticipantsFromBracket = (mappedParticipants, bracketData) => {
    if (!bracketData || !bracketData.matches || bracketData.matches.length === 0) {
        return mappedParticipants;
    }

    const placedParticipantIds = new Set();

    // Track all placed participants from the bracket data
    bracketData.matches.forEach(match => {
        if (match.player1) {
            placedParticipantIds.add(match.player1.id);
        }
        if (match.player2) {
            placedParticipantIds.add(match.player2.id);
        }
    });

    // Update participant status
    return mappedParticipants.map(p => ({
        ...p,
        isPlaced: placedParticipantIds.has(p.id)
    }));
};

export const findParticipantById = (participants, id) => {
    return participants.find(p => p.id === id);
};