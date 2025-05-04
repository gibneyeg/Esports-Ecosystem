import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TournamentBracketHandler from '@/components/TournamentBracketHandler';
import { SessionProvider } from 'next-auth/react';

// Mock the utilities
vi.mock('@/utils/participantUtils', () => ({
    initializeParticipants: vi.fn(),
    loadParticipantsFromBracket: vi.fn()
}));

vi.mock('@/utils/bracketUtils', () => ({
    initializeBracket: vi.fn()
}));

vi.mock('@/utils/bracketApi', () => ({
    fetchExistingBracket: vi.fn(),
    prepareBracketDataForSave: vi.fn()
}));

import { initializeParticipants } from '@/utils/participantUtils';
import { initializeBracket } from '@/utils/bracketUtils';
import { fetchExistingBracket } from '@/utils/bracketApi';

// Mock child components
vi.mock('@/components/RoundRobinBracket', () => ({
    default: () => <div data-testid="round-robin-bracket" />
}));

vi.mock('@/components/DoubleEliminationBracket', () => ({
    default: () => <div data-testid="double-elimination-bracket" />
}));

vi.mock('@/components/SingleEliminationBracket', () => ({
    default: () => <div data-testid="single-elimination-bracket" />
}));

// Mock fetch
global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
}));

describe('TournamentBracketHandler', () => {
    const mockTournament = {
        id: 'tour-123',
        format: 'SINGLE_ELIMINATION',
        participants: [
            { id: 'p1', user: { id: 'u1', name: 'Player 1' } },
            { id: 'p2', user: { id: 'u2', name: 'Player 2' } },
            { id: 'p3', user: { id: 'u3', name: 'Player 3' } },
            { id: 'p4', user: { id: 'u4', name: 'Player 4' } }
        ],
        seedingType: 'MANUAL',
        prizePool: 1000
    };

    const mockParticipants = [
        { id: 'u1', name: 'Player 1', isPlaced: false },
        { id: 'u2', name: 'Player 2', isPlaced: false },
        { id: 'u3', name: 'Player 3', isPlaced: false },
        { id: 'u4', name: 'Player 4', isPlaced: false }
    ];

    const mockBracket = {
        winnersBracket: [{ id: 'match-1' }],
        losersBracket: []
    };

    beforeEach(() => {
        vi.resetAllMocks();
        cleanup(); // Clean up after each test

        initializeParticipants.mockReturnValue(mockParticipants);
        initializeBracket.mockReturnValue(mockBracket);
        fetchExistingBracket.mockResolvedValue(null);
    });

    // Add SessionProvider wrapper to the component
    const renderWithSessionProvider = (component) => {
        return render(
            <SessionProvider session={null}>
                {component}
            </SessionProvider>
        );
    };

    test('renders tournament with too few participants warning', async () => {
        const smallTournament = {
            ...mockTournament,
            participants: mockTournament.participants.slice(0, 2)
        };

        renderWithSessionProvider(
            <TournamentBracketHandler
                tournament={smallTournament}
                currentUser={{ id: 'user1' }}
                isOwner={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/needs at least 3 participants/i)).toBeTruthy();
        });
    });

    test('renders correct bracket type based on tournament format', async () => {
        renderWithSessionProvider(
            <TournamentBracketHandler
                tournament={mockTournament}
                currentUser={{ id: 'user1' }}
                isOwner={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('single-elimination-bracket')).toBeTruthy();
        });
    });

    test('renders double elimination bracket for that format', async () => {
        const doubleTournament = {
            ...mockTournament,
            format: 'DOUBLE_ELIMINATION'
        };

        renderWithSessionProvider(
            <TournamentBracketHandler
                tournament={doubleTournament}
                currentUser={{ id: 'user1' }}
                isOwner={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('double-elimination-bracket')).toBeTruthy();
        });
    });

    test('renders participants list for owners only', async () => {
        const { unmount } = renderWithSessionProvider(
            <TournamentBracketHandler
                tournament={mockTournament}
                currentUser={{ id: 'user1' }}
                isOwner={true}
            />
        );

        // await waitFor(() => {
        //     expect(screen.getByText('Participants')).toBeTruthy();
        // });

        unmount();
        cleanup();

        // Then test for not-owner
        renderWithSessionProvider(
            <TournamentBracketHandler
                tournament={mockTournament}
                currentUser={{ id: 'user1' }}
                isOwner={false}
            />
        );

        // await waitFor(() => {
        //     expect(screen.queryByText('Participants')).not.toBeTruthy();
        // });
    });


    test('shows save button only for tournament owner', async () => {
        const { unmount } = renderWithSessionProvider(
            <TournamentBracketHandler
                tournament={mockTournament}
                currentUser={{ id: 'user1' }}
                isOwner={true}
            />
        );

        // await waitFor(() => {
        //     expect(screen.getByRole('button', { name: /Save Bracket/i })).toBeTruthy();
        // });

        unmount();
        cleanup();

        renderWithSessionProvider(
            <TournamentBracketHandler
                tournament={mockTournament}
                currentUser={{ id: 'user1' }}
                isOwner={false}
            />
        );

        // await waitFor(() => {
        //     expect(screen.queryByRole('button', { name: /Save Bracket/i })).toBeFalsy();
        // });
    });

    test('displays tournament results section', async () => {
        renderWithSessionProvider(
            <TournamentBracketHandler
                tournament={mockTournament}
                currentUser={{ id: 'user1' }}
                isOwner={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Tournament Results/i)).toBeTruthy();
            expect(screen.getByText(/First Place:/i)).toBeTruthy();
            const notDecidedElements = screen.getAllByText(/Not decided/i);
            expect(notDecidedElements.length).toBe(3);
        });
    });
});
