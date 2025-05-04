import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import TournamentWinner from "../TournamentWinner";
import { useSession } from "next-auth/react";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn()
}));

describe("TournamentWinner", () => {
  const mockSession = {
    data: {
      user: {
        id: "owner-id",
        email: "owner@test.com"
      }
    }
  };

  const mockOnWinnerDeclared = vi.fn();

  const defaultProps = {
    tournament: {
      id: "tournament-1",
      status: "IN_PROGRESS",
      prizePool: 1000,
      participants: [
        { user: { id: "user1", name: "Player 1" } },
        { user: { id: "user2", name: "Player 2" } },
        { user: { id: "user3", name: "Player 3" } }
      ]
    },
    hasAccess: true,
    canEdit: true,
    isOwner: true,
    onWinnerDeclared: mockOnWinnerDeclared
  };

  global.fetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSession.mockReturnValue(mockSession);

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tournament: { id: "tournament-1" } })
    });
  });

  it("does not render tournament results when no winners exist", () => {
    render(<TournamentWinner {...defaultProps} />);
    expect(screen.queryByText("Tournament Results")).not.toBeInTheDocument();
  });

  it("renders declare winners button when conditions are met", () => {
    render(<TournamentWinner {...defaultProps} />);
    expect(screen.getByText("Declare Winners")).toBeInTheDocument();
  });

  it("renders nothing when no session exists", () => {
    useSession.mockReturnValue({ data: null });
    const { container } = render(<TournamentWinner {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });


  it("opens modal when declare winners button is clicked", async () => {
    render(<TournamentWinner {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Declare Winners"));
    });

    expect(screen.getByText("Select Tournament Winners")).toBeInTheDocument();
    expect(screen.getByText(/First Place.*\$500/)).toBeInTheDocument();
  });

  it("shows error when no first place winner is selected", async () => {
    render(<TournamentWinner {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Declare Winners"));
    });

    const submitButton = screen.getAllByText("Declare Winners")[1];
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText("Please select at least a first place winner")).toBeInTheDocument();
  });

  it("shows error when duplicate winners are selected", async () => {
    render(<TournamentWinner {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Declare Winners"));
    });

    const selects = screen.getAllByRole('combobox');
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: "user1" } });
      fireEvent.change(selects[1], { target: { value: "user1" } });
    });

    const submitButton = screen.getAllByText("Declare Winners")[1];
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText("Each player can only win one position")).toBeInTheDocument();
  });

  it("successfully declares winners and makes API call", async () => {
    render(<TournamentWinner {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Declare Winners"));
    });

    const selects = screen.getAllByRole('combobox');
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: "user1" } });
    });

    const submitButton = screen.getAllByText("Declare Winners")[1];
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/tournaments/${defaultProps.tournament.id}/winner`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    expect(mockOnWinnerDeclared).toHaveBeenCalled();
  });

  it("handles API error when declaring winners", async () => {
    const errorMessage = "Failed to declare winners";
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: errorMessage })
    });

    render(<TournamentWinner {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Declare Winners"));
    });

    const firstSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(firstSelect, { target: { value: "user1" } });
    });

    const submitButton = screen.getAllByText("Declare Winners")[1];
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("disables buttons while submitting", async () => {
    global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<TournamentWinner {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Declare Winners"));
    });

    const firstSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(firstSelect, { target: { value: "user1" } });
    });

    const submitButton = screen.getAllByText("Declare Winners")[1];
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByText("Declaring...")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });
});