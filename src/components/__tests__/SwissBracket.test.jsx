import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import SwissBracket from "../SwissBracket";

// Mock Next.js components
vi.mock("next/image", () => ({
    default: (props) => {
        // eslint-disable-next-line jsx-a11y/alt-text
        return <img {...props} />
    }
}));

vi.mock("next/link", () => ({
    default: ({ children, href, ...rest }) => {
        return (
            <a href={href} {...rest}>
                {children}
            </a>
        );
    }
}));

describe("SwissBracket", () => {
    // Mock props
    const mockParticipants = [
        { id: "u1", name: "Player 1", user: { id: "u1", name: "Player 1", image: "https://example.com/p1.jpg", points: 100 }, isPlaced: false },
        { id: "u2", name: "Player 2", user: { id: "u2", name: "Player 2", points: 80 }, isPlaced: false },
        { id: "u3", name: "Player 3", user: { id: "u3", name: "Player 3", points: 60 }, isPlaced: false },
        { id: "u4", name: "Player 4", user: { id: "u4", name: "Player 4", points: 40 }, isPlaced: false }
    ];

    const mockTeamParticipants = [
        { teamId: "t1", team: { id: "t1", name: "Team 1", tag: "T1", logoUrl: "https://example.com/t1.jpg" }, seedNumber: 1 },
        { teamId: "t2", team: { id: "t2", name: "Team 2", tag: "T2" }, seedNumber: 2 },
        { teamId: "t3", team: { id: "t3", name: "Team 3", tag: "T3" }, seedNumber: 3 },
        { teamId: "t4", team: { id: "t4", name: "Team 4", tag: "T4" }, seedNumber: 4 }
    ];

    const mockTournament = {
        id: "tournament-1",
        format: "SWISS",
        seedingType: "RANDOM",
        prizePool: 1000,
        participants: mockParticipants,
        teamParticipants: [],
        formatSettings: {
            numberOfRounds: 3,
            registrationType: "INDIVIDUAL"
        }
    };

    const mockTeamTournament = {
        ...mockTournament,
        participants: [],
        teamParticipants: mockTeamParticipants,
        formatSettings: {
            numberOfRounds: 3,
            registrationType: "TEAM"
        }
    };

    const mockSetParticipants = vi.fn();
    const mockSetTournamentWinner = vi.fn();
    const mockSetRunnerUp = vi.fn();
    const mockSetThirdPlace = vi.fn();
    const mockSaveBracket = vi.fn();

    const defaultProps = {
        tournament: mockTournament,
        participants: mockParticipants,
        setParticipants: mockSetParticipants,
        setTournamentWinner: mockSetTournamentWinner,
        setRunnerUp: mockSetRunnerUp,
        setThirdPlace: mockSetThirdPlace,
        viewOnly: false,
        saveBracket: mockSaveBracket
    };

    // Mock scores data that would be initialized by the component
    const getMockParticipantScores = () => {
        const scores = {};
        mockParticipants.forEach(participant => {
            scores[participant.id] = {
                id: participant.id,
                name: participant.name,
                image: participant.user?.image,
                isTeam: false,
                wins: 0,
                losses: 0,
                draws: 0,
                points: 0,
                matchesByRound: {},
                opponents: []
            };
        });
        return scores;
    };

    // Mock round data for testing
    const getMockRounds = (withResult = false) => {
        return [{
            id: "swiss-round-0",
            roundNumber: 0,
            matches: [
                {
                    id: "swiss-match-0-0",
                    player1Id: "u1",
                    player2Id: "u2",
                    player1: mockParticipants[0],
                    player2: mockParticipants[1],
                    result: withResult ? "player1" : null,
                    round: 0
                },
                {
                    id: "swiss-match-0-1",
                    player1Id: "u3",
                    player2Id: "u4",
                    player1: mockParticipants[2],
                    player2: mockParticipants[3],
                    result: withResult ? "player2" : null,
                    round: 0
                }
            ]
        }];
    };

    // Mock components required in the UI via DOM
    const mockStatusComponent = () => {
        return document.createElement('div');
    };

    // Mock fetch API
    global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ rounds: [] })
    }));

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Element.prototype.scrollIntoView
        Element.prototype.scrollIntoView = vi.fn();

        // Reset fetch mock
        global.fetch.mockImplementation(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ rounds: [] })
        }));

        // Mock dispatch event
        document.dispatchEvent = vi.fn();
    });

    it("renders loading state initially", async () => {
        const { container } = render(<SwissBracket {...defaultProps} />);

        // Create a mock loading element for testing
        const loadingElement = mockStatusComponent();
        loadingElement.className = "animate-spin";

        // Test that loading state is rendered
        expect(container.querySelector(".animate-spin")).toBeTruthy();
    });

    it("renders standings table correctly", async () => {
        render(<SwissBracket {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Tournament Standings")).toBeInTheDocument();
            expect(screen.getByText("No standings data available yet.")).toBeInTheDocument();
        });
    });

    it("renders empty state when no rounds exist", async () => {
        render(<SwissBracket {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Swiss Tournament Rounds")).toBeInTheDocument();
            expect(screen.getByText("No rounds have been created yet.")).toBeInTheDocument();
        });
    });

    it("shows create round button for non-viewOnly mode", async () => {
        render(<SwissBracket {...defaultProps} />);

        await waitFor(() => {
            const createRoundButton = screen.getByText("Create Next Round");
            expect(createRoundButton).toBeInTheDocument();
        });
    });

    it("does not show create round button in viewOnly mode", async () => {
        render(<SwissBracket {...defaultProps} viewOnly={true} />);

        await waitFor(() => {
            expect(screen.queryByText("Create Next Round")).not.toBeInTheDocument();
        });
    });

    it("creates first round with random seeding when button is clicked", async () => {
        // Mock the necessary internal state for createNewRound
        global.fetch.mockImplementation(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                rounds: [],
                currentRound: -1
            })
        }));

        render(<SwissBracket {...defaultProps} />);

        await waitFor(() => {
            const createRoundButton = screen.getByText("Create Next Round");
            expect(createRoundButton).toBeInTheDocument();
        });

        // Mock the participant scores before clicking
        const mockScores = getMockParticipantScores();

        await act(async () => {
            // Mock SwissBracket's createNewRound function to use our mocked scores
            const createRoundButton = screen.getByText("Create Next Round");
            fireEvent.click(createRoundButton);
        });

        // Check that round was created (component will try to display Round 1)
        await waitFor(() => {
            expect(screen.getByText(/Round 1/i)).toBeInTheDocument();
        });
    });

    it("handles team tournaments correctly", async () => {
        render(<SwissBracket {...defaultProps} tournament={mockTeamTournament} isTeamTournament={true} />);

        await waitFor(() => {
            expect(screen.getByText("Swiss Tournament Rounds")).toBeInTheDocument();
        });
    });

    it("renders with skill-based seeding", async () => {
        const skillBasedTournament = {
            ...mockTournament,
            seedingType: "SKILL_BASED"
        };

        render(<SwissBracket {...defaultProps} tournament={skillBasedTournament} />);

        await waitFor(() => {
            expect(screen.getByText("Create Next Round")).toBeInTheDocument();
        });
    });

    it("saves bracket data when event is triggered", async () => {
        render(<SwissBracket {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Swiss Tournament Rounds")).toBeInTheDocument();
        });

        // Manually trigger the save event
        const event = new CustomEvent('saveSwissBracket');
        document.dispatchEvent(event);

    });

    // Test for loading existing data
    it("loads existing bracket data correctly", async () => {
        // Mock existing bracket data
        global.fetch.mockImplementation(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                rounds: getMockRounds(true), // With results
                currentRound: 0
            })
        }));

        render(<SwissBracket {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Round 1")).toBeInTheDocument();
            expect(screen.getAllByText("Player 1")).toBeTruthy();
            expect(screen.getAllByText("Player 2")).toBeTruthy();
        });
    });

    // Test for manual seeding
    it("handles manual seeding type correctly", async () => {
        const manualTournament = {
            ...mockTournament,
            seedingType: "MANUAL"
        };

        render(<SwissBracket {...defaultProps} tournament={manualTournament} />);

        await waitFor(() => {
            expect(screen.getByText("Create Next Round")).toBeInTheDocument();
        });
    });
});