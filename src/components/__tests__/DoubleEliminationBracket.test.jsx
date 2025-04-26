import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import DoubleEliminationBracket from "../DoubleEliminationBracket";
import * as bracketUtils from "@/utils/bracketUtils";
import * as bracketApi from "@/utils/bracketApi";
import * as participantUtils from "@/utils/participantUtils";

// Mock the utility functions
vi.mock('@/utils/bracketUtils', () => ({
    initializeBracket: vi.fn(),
    getNextWinnersMatch: vi.fn(),
    getDropToLosersMatch: vi.fn(),
    getNextLosersMatch: vi.fn()
}));

vi.mock('@/utils/bracketApi', () => ({
    fetchExistingBracket: vi.fn(),
    prepareBracketDataForSave: vi.fn()
}));

vi.mock('@/utils/participantUtils', () => ({
    loadParticipantsFromBracket: vi.fn(),
    findParticipantById: vi.fn()
}));

describe("DoubleEliminationBracket", () => {
    // Mock props
    const mockParticipants = [
        { id: "p1", name: "Player 1", isPlaced: false },
        { id: "p2", name: "Player 2", isPlaced: false },
        { id: "p3", name: "Player 3", isPlaced: false },
        { id: "p4", name: "Player 4", isPlaced: false }
    ];

    const mockTournament = {
        id: "tournament-1",
        format: "DOUBLE_ELIMINATION"
    };

    const mockSetParticipants = vi.fn();
    const mockSetSelectedParticipant = vi.fn();
    const mockSetTournamentWinner = vi.fn();
    const mockSetRunnerUp = vi.fn();
    const mockSetThirdPlace = vi.fn();
    const mockSaveBracket = vi.fn();

    const defaultProps = {
        tournament: mockTournament,
        participants: mockParticipants,
        setParticipants: mockSetParticipants,
        selectedParticipant: null,
        setSelectedParticipant: mockSetSelectedParticipant,
        setTournamentWinner: mockSetTournamentWinner,
        setRunnerUp: mockSetRunnerUp,
        setThirdPlace: mockSetThirdPlace,
        viewOnly: false,
        saveBracket: mockSaveBracket
    };

    // Mock bracket structures
    const mockWinnersBracket = [
        {
            id: "winners-round-0",
            name: "Round 1",
            matches: [
                {
                    id: "winners-0-0",
                    round: 0,
                    position: 0,
                    bracketType: "winners",
                    slots: [
                        { id: "winners-slot-0-0-0", participant: null },
                        { id: "winners-slot-0-0-1", participant: null }
                    ]
                },
                {
                    id: "winners-0-1",
                    round: 0,
                    position: 1,
                    bracketType: "winners",
                    slots: [
                        { id: "winners-slot-0-1-0", participant: null },
                        { id: "winners-slot-0-1-1", participant: null }
                    ]
                }
            ]
        },
        {
            id: "winners-round-1",
            name: "Finals",
            matches: [
                {
                    id: "winners-1-0",
                    round: 1,
                    position: 0,
                    bracketType: "winners",
                    slots: [
                        { id: "winners-slot-1-0-0", participant: null },
                        { id: "winners-slot-1-0-1", participant: null }
                    ]
                }
            ]
        }
    ];

    const mockLosersBracket = [
        {
            id: "losers-round-0",
            name: "Losers Round 1",
            matches: [
                {
                    id: "losers-0-0",
                    round: 0,
                    position: 0,
                    bracketType: "losers",
                    slots: [
                        { id: "losers-slot-0-0-0", participant: null },
                        { id: "losers-slot-0-0-1", participant: null }
                    ]
                }
            ]
        },
        {
            id: "losers-round-1",
            name: "Losers Finals",
            matches: [
                {
                    id: "losers-1-0",
                    round: 1,
                    position: 0,
                    bracketType: "losers",
                    slots: [
                        { id: "losers-slot-1-0-0", participant: null },
                        { id: "losers-slot-1-0-1", participant: null }
                    ]
                }
            ]
        }
    ];

    const mockGrandFinals = {
        id: "grand-finals",
        round: 0,
        position: 0,
        bracketType: "finals",
        slots: [
            { id: "grand-finals-slot-0", participant: null },
            { id: "grand-finals-slot-1", participant: null }
        ]
    };

    const mockResetMatch = {
        id: "reset-match",
        round: 0,
        position: 0,
        bracketType: "reset",
        slots: [
            { id: "reset-match-slot-0", participant: null },
            { id: "reset-match-slot-1", participant: null }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock returns
        bracketUtils.initializeBracket.mockReturnValue({
            winnersBracket: mockWinnersBracket,
            losersBracket: mockLosersBracket,
            grandFinals: mockGrandFinals,
            resetMatch: mockResetMatch
        });

        bracketApi.fetchExistingBracket.mockResolvedValue(null);
        participantUtils.findParticipantById.mockImplementation((participants, id) =>
            participants.find(p => p.id === id)
        );
    });

    it("renders winners and losers brackets", async () => {
        await act(async () => {
            render(<DoubleEliminationBracket {...defaultProps} />);
        });

        expect(screen.getByText("Winners Bracket")).toBeInTheDocument();
        expect(screen.getByText("Losers Bracket")).toBeInTheDocument();
        // Using getAllByText because "Finals" appears multiple times
        expect(screen.getAllByText("Finals")[0]).toBeInTheDocument();
        expect(screen.getByText("Round 1")).toBeInTheDocument();
    });

    it("initializes brackets on mount", async () => {
        await act(async () => {
            render(<DoubleEliminationBracket {...defaultProps} />);
        });

        expect(bracketUtils.initializeBracket).toHaveBeenCalledWith(
            mockParticipants.length,
            'DOUBLE_ELIMINATION'
        );
        expect(bracketApi.fetchExistingBracket).toHaveBeenCalledWith(mockTournament.id);
    });

    it("renders the correct number of slots in each bracket", async () => {
        await act(async () => {
            render(<DoubleEliminationBracket {...defaultProps} />);
        });

        const emptySlots = screen.getAllByText("Empty Slot");
        expect(emptySlots.length).toBe(12);
    });

    it("places a participant when a slot is clicked with a selected participant", async () => {
        const selectedParticipant = mockParticipants[0];
        const propsWithSelectedParticipant = {
            ...defaultProps,
            selectedParticipant
        };

        await act(async () => {
            render(<DoubleEliminationBracket {...propsWithSelectedParticipant} />);
        });

        const firstEmptySlot = screen.getAllByText("Empty Slot")[0];
        await act(async () => {
            fireEvent.click(firstEmptySlot);
        });

        expect(mockSetParticipants).toHaveBeenCalled();
        expect(mockSetSelectedParticipant).toHaveBeenCalledWith(null);
    });

    it("shows Grand Finals and Reset Match when configured", async () => {
        await act(async () => {
            render(<DoubleEliminationBracket {...defaultProps} />);
        });

        expect(screen.getByText("Grand Finals")).toBeInTheDocument();

        // Reset match should not be visible initially
        const resetMatchHeading = screen.queryByText("Reset Match (Final)");
        expect(resetMatchHeading).not.toBeInTheDocument();

        const component = document.createElement('div');
        const event = new CustomEvent('saveDoubleEliminationBracket', { bubbles: true });
        component.dispatchEvent(event);
    });

    it("handles a match result when advancing players", async () => {
        // Mock setup for a match that has participants
        const modifiedWinnersBracket = JSON.parse(JSON.stringify(mockWinnersBracket));
        modifiedWinnersBracket[0].matches[0].slots[0].participant = mockParticipants[0];
        modifiedWinnersBracket[0].matches[0].slots[1].participant = mockParticipants[1];

        bracketUtils.initializeBracket.mockReturnValue({
            winnersBracket: modifiedWinnersBracket,
            losersBracket: mockLosersBracket,
            grandFinals: mockGrandFinals,
            resetMatch: mockResetMatch
        });

        bracketUtils.getNextWinnersMatch.mockReturnValue({
            type: 'winners',
            match: modifiedWinnersBracket[1].matches[0],
            slotIndex: 0
        });

        bracketUtils.getDropToLosersMatch.mockReturnValue({
            type: 'losers',
            match: mockLosersBracket[0].matches[0],
            slotIndex: 0
        });

        await act(async () => {
            render(<DoubleEliminationBracket {...defaultProps} />);
        });

        // Find the buttons to advance players
        const advancePlayer1Button = screen.getByText("Player 1 won");

        await act(async () => {
            fireEvent.click(advancePlayer1Button);
        });

        expect(bracketUtils.getNextWinnersMatch).toHaveBeenCalled();
        expect(bracketUtils.getDropToLosersMatch).toHaveBeenCalled();
    });

    it("calls saveBracket when a save event is triggered", async () => {
        bracketApi.prepareBracketDataForSave.mockReturnValue({
            rounds: [],
            tournamentWinnerId: null
        });

        await act(async () => {
            render(<DoubleEliminationBracket {...defaultProps} />);
        });

        // Trigger the save event
        await act(async () => {
            document.dispatchEvent(new CustomEvent('saveDoubleEliminationBracket'));
        });

        expect(bracketApi.prepareBracketDataForSave).toHaveBeenCalled();
        expect(mockSaveBracket).toHaveBeenCalled();
    });

    it("renders in view-only mode correctly", async () => {
        await act(async () => {
            render(<DoubleEliminationBracket {...defaultProps} viewOnly={true} />);
        });

        // Populate a match with participants
        const modifiedWinnersBracket = JSON.parse(JSON.stringify(mockWinnersBracket));
        modifiedWinnersBracket[0].matches[0].slots[0].participant = mockParticipants[0];
        modifiedWinnersBracket[0].matches[0].slots[1].participant = mockParticipants[1];

        bracketUtils.initializeBracket.mockReturnValue({
            winnersBracket: modifiedWinnersBracket,
            losersBracket: mockLosersBracket,
            grandFinals: mockGrandFinals,
            resetMatch: mockResetMatch
        });

        // In view-only mode, no action buttons should be present
        const advanceButtons = screen.queryByText("Player 1 won");
        expect(advanceButtons).not.toBeInTheDocument();
    });

    it("loads existing bracket data when available", async () => {
        const existingBracketData = {
            matches: [
                {
                    round: 0,
                    position: 0,
                    player1: { id: "p1" },
                    player2: { id: "p2" },
                    winnerId: "p1"
                },
                {
                    round: 1,
                    position: 0,
                    player1: { id: "p1" },
                    player2: null
                }
            ]
        };

        bracketApi.fetchExistingBracket.mockResolvedValue(existingBracketData);

        await act(async () => {
            render(<DoubleEliminationBracket {...defaultProps} />);
        });

        expect(bracketApi.fetchExistingBracket).toHaveBeenCalledWith(mockTournament.id);

    });
});