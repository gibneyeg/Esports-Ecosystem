import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import TournamentManagement from "../TournamentManagment";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

describe("TournamentManagement", () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
  };

  const mockSession = {
    data: {
      user: {
        email: "test@example.com",
      },
    },
  };

  global.fetch = vi.fn();

  const defaultProps = {
    tournamentId: "123",
    hasAccess: true,
    canEdit: true,
    isOwner: true,
  };

  const renderComponent = (props = {}) => {
    return render(<TournamentManagement {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useRouter.mockReturnValue(mockRouter);
    useSession.mockReturnValue(mockSession);
  });

  it("renders nothing when no session exists", () => {
    useSession.mockReturnValue({ data: null });
    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });

  it("renders edit and cancel buttons when session exists", () => {
    renderComponent();
    expect(screen.getByText("Edit Tournament")).toBeInTheDocument();
    expect(screen.getByText("Cancel Tournament")).toBeInTheDocument();
  });

  it("navigates to edit page when edit button is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Edit Tournament"));
    expect(mockRouter.push).toHaveBeenCalledWith("/tournament/123/edit");
  });

  it("shows confirmation dialog when cancel button is clicked", async () => {
    renderComponent();

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel Tournament"));
    });

    expect(
      screen.getByText(/Are you sure you want to cancel this tournament?/)
    ).toBeInTheDocument();
    expect(screen.getByText("No, keep tournament")).toBeInTheDocument();
    expect(screen.getByText("Yes, cancel tournament")).toBeInTheDocument();
  });

  it("hides confirmation dialog when 'No, keep tournament' is clicked", async () => {
    renderComponent();

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel Tournament"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("No, keep tournament"));
    });

    expect(
      screen.queryByText(/Are you sure you want to cancel this tournament?/)
    ).not.toBeInTheDocument();
  });

  it("handles successful tournament cancellation", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: "Tournament cancelled" }),
    });

    renderComponent();

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel Tournament"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Yes, cancel tournament"));
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/tournaments/123", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
      });
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/tournament");
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it("displays error message when cancellation fails", async () => {
    const errorMessage = "Failed to cancel tournament";
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: errorMessage }),
    });

    renderComponent();

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel Tournament"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Yes, cancel tournament"));
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  it("disables buttons while cancellation is in progress", async () => {
    global.fetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderComponent();

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel Tournament"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Yes, cancel tournament"));
    });

    expect(screen.getByText("Cancelling...")).toBeInTheDocument();
    expect(screen.getByText("No, keep tournament")).toBeDisabled();
    expect(screen.getByText("Cancelling...")).toBeDisabled();
  });
});
