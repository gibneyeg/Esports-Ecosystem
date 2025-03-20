import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import RoundRobinBracket from "../RoundRobinBracket";
import * as bracketApi from "@/utils/bracketApi";

// Mock the fetchExistingBracket API function
vi.mock('@/utils/bracketApi', () => ({
    fetchExistingBracket: vi.fn()
}));

describe("RoundRobinBracket", () => {
    // Mock props
    const mockParticipants = [
        { id: "p1", name: "Player 1", isPlaced: false },
        { id: "p2", name: "Player 2", isPlaced: false },
        { id: "p3", name: "Player 3", isPlaced: false },
        { id: "p4", name: "Player 4", isPlaced: false }
    ];

    const mockTournament = {
        id: "tournament-1",
        format: "ROUND_ROBIN",
        formatSettings: {
            groupSize: 4
        }
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
        tournamentWinner: null,
        setRunnerUp: mockSetRunnerUp,
        runnerUp: null,
        setThirdPlace: mockSetThirdPlace,
        thirdPlace: null,
        viewOnly: false,
        saveBracket: mockSaveBracket
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock returns
        bracketApi.fetchExistingBracket.mockResolvedValue(null);
    });

    it("renders loading state initially", async () => {
        render(<RoundRobinBracket {...defaultProps} />);
        expect(screen.getByText("Loading round robin bracket...")).toBeInTheDocument();
    });

    it("initializes with group structure", async () => {
        // Mock fetch completion
        bracketApi.fetchExistingBracket.mockResolvedValue({
            matches: []
        });

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        expect(screen.queryByText("Loading round robin bracket...")).not.toBeInTheDocument();
        expect(screen.getByText("Group Assignment")).toBeInTheDocument();
        expect(screen.getByText("Group A")).toBeInTheDocument();
    });

    it("allows resetting the bracket", async () => {
        bracketApi.fetchExistingBracket.mockResolvedValue({
            matches: []
        });

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        const resetButton = screen.getByText("Reset Bracket");
        await act(async () => {
            fireEvent.click(resetButton);
        });

        // After reset, should still have the group structure
        expect(screen.getByText("Group A")).toBeInTheDocument();
    });

    it("renders participant assignment UI when not in view-only mode", async () => {
        bracketApi.fetchExistingBracket.mockResolvedValue({
            matches: []
        });

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        expect(screen.getByText("Group Assignment")).toBeInTheDocument();
        expect(screen.getByText("Click a participant from the list, then click a group to assign them.")).toBeInTheDocument();
    });

    it("does not render participant assignment UI in view-only mode", async () => {
        bracketApi.fetchExistingBracket.mockResolvedValue({
            matches: []
        });

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} viewOnly={true} />);
        });

        expect(screen.queryByText("Group Assignment")).not.toBeInTheDocument();
        expect(screen.queryByText("Click a participant from the list, then click a group to assign them.")).not.toBeInTheDocument();
    });

    it("renders group standings for each group", async () => {
        bracketApi.fetchExistingBracket.mockResolvedValue({
            matches: []
        });

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        expect(screen.getByText("Group A Standings")).toBeInTheDocument();

        expect(screen.getByText("No participants assigned to this group")).toBeInTheDocument();
    });

    it("renders matches section for each group", async () => {
        bracketApi.fetchExistingBracket.mockResolvedValue({
            matches: []
        });

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        expect(screen.getByText("Group A Matches")).toBeInTheDocument();

        expect(screen.getByText("Need at least 2 participants to generate matches")).toBeInTheDocument();
    });

    it("allows assigning participants to groups when a participant is selected", async () => {
        bracketApi.fetchExistingBracket.mockResolvedValue({
            matches: []
        });

        const propsWithSelectedParticipant = {
            ...defaultProps,
            selectedParticipant: mockParticipants[0]
        };

        await act(async () => {
            render(<RoundRobinBracket {...propsWithSelectedParticipant} />);
        });

        // Find the group container
        const groupAContainer = screen.getByText("Group A").closest("div");

        await act(async () => {
            fireEvent.click(groupAContainer);
        });

        expect(mockSetSelectedParticipant).toHaveBeenCalledWith(null);
    });

    it("generates matches when participants are assigned to groups", async () => {
        const mockBracketData = {
            matches: [
                {
                    id: "match-group-1-0-1",
                    groupId: "group-1",
                    groupName: "Group A",
                    round: 1,
                    position: 0,
                    player1: { id: "p1" },
                    player2: { id: "p2" },
                    winner: null,
                    score: null,
                    isDraw: false
                }
            ]
        };

        bracketApi.fetchExistingBracket.mockResolvedValue(mockBracketData);

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        expect(screen.getByText("Group A Matches")).toBeInTheDocument();
    });

    it("calls saveBracket when match results are updated", async () => {
        const mockBracketData = {
            matches: [
                {
                    id: "match-group-1-0-1",
                    groupId: "group-1",
                    groupName: "Group A",
                    round: 1,
                    position: 0,
                    player1: { id: "p1" },
                    player2: { id: "p2" },
                    winner: null,
                    score: null,
                    isDraw: false
                }
            ]
        };

        bracketApi.fetchExistingBracket.mockResolvedValue(mockBracketData);

        const originalAddEventListener = document.addEventListener;
        const originalDispatchEvent = document.dispatchEvent;
        document.addEventListener = vi.fn((event, callback) => {
            if (event === 'saveRoundRobinBracket') {
                callback();
            }
        });
        document.dispatchEvent = vi.fn();

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        await act(async () => {
            document.dispatchEvent(new Event('saveRoundRobinBracket'));
        });

        expect(mockSaveBracket).toHaveBeenCalled();

        document.addEventListener = originalAddEventListener;
        document.dispatchEvent = originalDispatchEvent;
    });

    it("creates a tiebreaker when using 'Declare Winner Based on Rankings'", async () => {
        const mockBracketData = {
            matches: [
                {
                    id: "match-group-1-0-1",
                    groupId: "group-1",
                    groupName: "Group A",
                    round: 1,
                    position: 0,
                    player1: { id: "p1" },
                    player2: { id: "p2" },
                    winner: { id: "p1" },
                    score: "1-0",
                    isDraw: false
                },
                {
                    id: "match-group-1-0-2",
                    groupId: "group-1",
                    groupName: "Group A",
                    round: 1,
                    position: 1,
                    player1: { id: "p1" },
                    player2: { id: "p3" },
                    winner: { id: "p1" },
                    score: "1-0",
                    isDraw: false
                },
                {
                    id: "match-group-1-1-2",
                    groupId: "group-1",
                    groupName: "Group A",
                    round: 1,
                    position: 2,
                    player1: { id: "p2" },
                    player2: { id: "p3" },
                    winner: { id: "p2" },
                    score: "1-0",
                    isDraw: false
                }
            ]
        };

        bracketApi.fetchExistingBracket.mockResolvedValue(mockBracketData);

        const origDispatchEvent = document.dispatchEvent;
        document.dispatchEvent = vi.fn();

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        const declareWinnerButton = screen.getByText("Declare Winner Based on Rankings");

        await act(async () => {
            fireEvent.click(declareWinnerButton);
        });

        expect(document.dispatchEvent).toHaveBeenCalled();

        expect(mockSetTournamentWinner).toHaveBeenCalled();

        document.dispatchEvent = origDispatchEvent;
    });

    it("loads existing bracket data when available", async () => {
        const mockBracketData = {
            matches: [
                {
                    id: "match-group-1-0-1",
                    groupId: "group-1",
                    groupName: "Group A",
                    round: 1,
                    position: 0,
                    player1: { id: "p1" },
                    player2: { id: "p2" },
                    winner: { id: "p1" },
                    score: "1-0",
                    isDraw: false
                }
            ]
        };

        bracketApi.fetchExistingBracket.mockResolvedValue(mockBracketData);

        await act(async () => {
            render(<RoundRobinBracket {...defaultProps} />);
        });

        expect(bracketApi.fetchExistingBracket).toHaveBeenCalledWith(mockTournament.id);
    });
});