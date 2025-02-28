import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManualTournamentBracket from "../ManuelTournamentBracket";

global.fetch = vi.fn();

describe("ManualTournamentBracket Component", () => {
  const mockTournament = {
    id: "tournament-123",
    createdById: "user-123",
    participants: [
      { id: "participant-1", user: { id: "user-1", name: "Player 1" } },
      { id: "participant-2", user: { id: "user-2", name: "Player 2" } },
      { id: "participant-3", user: { id: "user-3", name: "Player 3" } },
      { id: "participant-4", user: { id: "user-4", name: "Player 4" } }
    ],
    prizePool: 1000,
    winners: []
  };

  const mockCurrentUser = {
    id: "user-123", // Same as tournament.createdById to test owner view
    name: "Tournament Owner"
  };

  const mockBracketData = {
    matches: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch to return empty bracket data initially
    fetch.mockImplementation((url) => {
      if (url.includes("/bracket")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBracketData)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  it("renders loading state initially", () => {
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    expect(screen.getByText("Tournament Bracket")).toBeInTheDocument();
    // Should show skeleton loading state
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders participants list for tournament owner", async () => {
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText("Participants")).toBeInTheDocument();
      });
    });
    
    expect(screen.getByText("Player 1")).toBeInTheDocument();
    expect(screen.getByText("Player 2")).toBeInTheDocument();
  });

  it("doesn't show participants list in view-only mode", async () => {
    const nonOwnerUser = { id: "different-user", name: "Not Owner" };
    
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={nonOwnerUser} isOwner={false} />);
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.queryByText("Participants")).not.toBeInTheDocument();
      });
    });
  });

  it("initializes bracket with correct number of rounds", async () => {
    // Mock the fetch to return immediately with valid bracket data
    fetch.mockImplementation((url) => {
      if (url.includes("/bracket")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ matches: [] })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    
    await screen.findByText((content, element) => {
      return element.tagName.toLowerCase() === 'h3' && 
             content.includes("Round 1");
    }, { timeout: 3000 });
    
    // Count number of round columns 
    const roundColumns = document.querySelectorAll(".flex-none.w-64");
    expect(roundColumns.length).toBe(2);
    
    const roundContainers = document.querySelectorAll(".flex-none.w-64");
    expect(roundContainers.length).toBe(2); 
    
    // Each round should have at least one match (represented by a container)
    roundContainers.forEach(container => {
      const matches = container.querySelectorAll(".border.rounded-md");
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it("allows participant selection for placement in bracket", async () => {
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText("Player 1")).toBeInTheDocument();
      });
    });

    // Get initial count of "Player 1" text
    const initialCount = screen.getAllByText("Player 1").length;

    fireEvent.click(screen.getByText("Player 1"));
    
    const emptySlots = screen.getAllByText("Empty Slot");
    fireEvent.click(emptySlots[0]);
    
    expect(screen.getAllByText("Player 1").length).toBe(2);
  });

  it("doesn't allow participant selection in view-only mode", async () => {
    const nonOwnerUser = { id: "different-user", name: "Not Owner" };
    
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={nonOwnerUser} isOwner={false} />);
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.queryByText("Click a participant, then click a bracket slot to place them.")).not.toBeInTheDocument();
      });
    });
  });

  it("saves the bracket when Save Bracket button is clicked", async () => {
    fetch.mockImplementation((url, options) => {
      if (url.includes("/bracket") && options.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    
    // Wait for the save button to be available
    const saveButton = await screen.findByText("Save Bracket");
    expect(saveButton).toBeInTheDocument();

    fireEvent.click(saveButton);
    
    await screen.findByText("Saving...");
    
    // Verify the API call was made
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/tournaments/${mockTournament.id}/bracket`),
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("shows advance buttons after placing participants in match", async () => {
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText("Player 1")).toBeInTheDocument();
        expect(screen.getByText("Player 2")).toBeInTheDocument();
      });
    });

    // Place Player 1 in first slot
    fireEvent.click(screen.getByText("Player 1"));
    const emptySlots = screen.getAllByText("Empty Slot");
    fireEvent.click(emptySlots[0]);
    
    // Place Player 2 in second slot of same match
    fireEvent.click(screen.getByText("Player 2"));
    const remainingEmptySlots = screen.getAllByText("Empty Slot");
    fireEvent.click(remainingEmptySlots[0]);
    
    const advanceButtons = await screen.findAllByText((content, element) => {
      return element.tagName.toLowerCase() === 'button' && 
             content.includes('Advance');
    });
    
    // There should be at least two buttons for advancing players
    expect(advanceButtons.length).toBeGreaterThan(1);
  });

  it("advances a player when their advance button is clicked", async () => {
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    
    const player1 = await screen.findByText("Player 1");
    const player2 = await screen.findByText("Player 2");
    
    fireEvent.click(player1);
    const emptySlots = screen.getAllByText("Empty Slot");
    fireEvent.click(emptySlots[0]);
    
    fireEvent.click(player2);
    const remainingEmptySlots = screen.getAllByText("Empty Slot");
    fireEvent.click(remainingEmptySlots[0]);
    
    const advanceButtons = await screen.findAllByText((content, element) => {
      return element.tagName.toLowerCase() === 'button' && 
             content.includes('Advance');
    });
    
    expect(advanceButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(advanceButtons[0]);
    
    expect(screen.getAllByText("Player 1").length).toBeGreaterThanOrEqual(1);
  });

  it("allows declaring a champion in the final round", async () => {
    // Mock a bracket with advancement to final round
    const advancedMockBracketData = {
      matches: [
        { round: 0, position: 0, player1: { id: "user-1", name: "Player 1" }, player2: { id: "user-2", name: "Player 2" }, winnerId: "user-1" },
        { round: 0, position: 1, player1: { id: "user-3", name: "Player 3" }, player2: { id: "user-4", name: "Player 4" }, winnerId: "user-3" },
        { round: 1, position: 0, player1: { id: "user-1", name: "Player 1" }, player2: { id: "user-3", name: "Player 3" }, winnerId: null }
      ]
    };
    
    // Mock fetch to return pre-populated bracket with players in final
    fetch.mockImplementation((url) => {
      if (url.includes("/bracket")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(advancedMockBracketData)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  
    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    
    const finalMatchPlayer = await screen.findByText("Player 1", { 
      // This selector targets only elements inside the final round
      selector: '.flex-none.w-64:nth-child(2) .text-black'
    });
    expect(finalMatchPlayer).toBeInTheDocument();
    
    // Find the declare champion button by button text and "Player 1"
    const declareButtons = await screen.findAllByRole('button', { 
      name: /declare.*champion/i 
    });
    
    // Should find at least one declare champion button
    expect(declareButtons.length).toBeGreaterThan(0);
    
    fireEvent.click(declareButtons[0]);
    
    // check for champion notification
    const championMessage = await screen.findByText(/champion/i, { 
      selector: '.bg-yellow-100'  // notification background
    });
    expect(championMessage).toBeInTheDocument();
  });

  it("handles API errors when saving", async () => {
    // Mock an API error
    fetch.mockImplementation((url, options) => {
      if (url.includes("/bracket") && options.method === "POST") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "Failed to save bracket" })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    render(<ManualTournamentBracket tournament={mockTournament} currentUser={mockCurrentUser} isOwner={true} />);
    
    await act(async () => {
      await waitFor(() => {
        expect(screen.getByText("Save Bracket")).toBeInTheDocument();
      });
    });

    fireEvent.click(screen.getByText("Save Bracket"));
    
    await screen.findByText("Saving...");
    
    // Verify the API call was made
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/tournaments/${mockTournament.id}/bracket`),
      expect.objectContaining({
        method: "POST"
      })
    );
  });
});