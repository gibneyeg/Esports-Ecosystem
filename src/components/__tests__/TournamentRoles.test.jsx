import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TournamentRoles from "../TournamentRoles";
import { useSession } from "next-auth/react";

// Mock next-auth
vi.mock("next-auth/react", () => ({
    useSession: vi.fn()
}));

// Mock next/image properly
vi.mock("next/image", () => ({
    default: (props) => {
        // eslint-disable-next-line jsx-a11y/alt-text
        return <img {...props} src={props.src || ""} width={props.width || 50} height={props.height || 50} />;
    }
}));

describe("TournamentRoles", () => {
    const mockTournamentId = "tour-123";
    const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User"
    };

    const mockSession = {
        data: {
            user: mockUser
        },
        status: "authenticated"
    };

    const mockRoles = [
        {
            id: "role-1",
            userId: "user-2",
            role: "ADMIN",
            user: {
                id: "user-2",
                name: "Admin User",
                email: "admin@example.com",
                image: "https://example.com/admin.jpg"
            },
            createdBy: {
                id: "user-1",
                name: "Test User",
                username: "testuser"
            }
        },
        {
            id: "role-2",
            userId: "user-3",
            role: "MODERATOR",
            user: {
                id: "user-3",
                name: "Mod User",
                email: "mod@example.com"
            },
            createdBy: {
                id: "user-1",
                name: "Test User"
            }
        }
    ];

    const mockTournament = {
        id: mockTournamentId,
        name: "Test Tournament",
        participants: [
            {
                user: {
                    id: "user-4",
                    name: "Participant 1",
                    email: "participant1@example.com",
                    image: "https://example.com/participant1.jpg"
                }
            },
            {
                user: {
                    id: "user-5",
                    name: "Participant 2",
                    email: "participant2@example.com"
                }
            }
        ]
    };

    global.fetch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useSession.mockReturnValue(mockSession);

        // Default successful responses
        global.fetch.mockImplementation((url) => {
            if (url.includes("/roles") && !url.includes("details")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockRoles)
                });
            }
            if (url.includes("/details")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTournament)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            });
        });
    });

    it("renders nothing when user is not owner", () => {
        const { container } = render(
            <TournamentRoles tournamentId={mockTournamentId} isOwner={false} />
        );

        expect(container.firstChild).toBeNull();
    });

    it("renders roles table when user is owner", async () => {
        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        await waitFor(() => {
            expect(screen.getByText("Tournament Administrators")).toBeInTheDocument();
            expect(screen.getByText("Manage Roles")).toBeInTheDocument();
            expect(screen.getByText("Add Role")).toBeInTheDocument();
        });

        // Check if roles are displayed
        expect(screen.getByText("Admin User")).toBeInTheDocument();
        expect(screen.getByText("admin@example.com")).toBeInTheDocument();
        expect(screen.getByText("Mod User")).toBeInTheDocument();
        expect(screen.getByText("mod@example.com")).toBeInTheDocument();
    });

    it("fetches roles on mount when user is owner", async () => {
        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(`/api/tournaments/${mockTournamentId}/roles`);
            expect(global.fetch).toHaveBeenCalledWith(`/api/tournaments/${mockTournamentId}/details`);
        });
    });

    it("shows add role form when Add Role button is clicked", async () => {
        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        const addButton = screen.getByText("Add Role");
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(screen.getByText("Cancel")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("Search participants by name or email")).toBeInTheDocument();
            expect(screen.getByRole("combobox")).toBeInTheDocument();
        });
    });

    it("searches participants when typing in search input", async () => {
        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        const addButton = screen.getByText("Add Role");
        fireEvent.click(addButton);

        const searchInput = screen.getByPlaceholderText("Search participants by name or email");

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "participant" } });
            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 600));
        });

        // The search requires minimum 3 characters
        await waitFor(() => {
            expect(screen.queryByText("No participants found")).not.toBeInTheDocument();
        });
    });

    it("adds role when clicking Add button", async () => {
        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        // Click Add Role to show search form
        const addButton = screen.getByText("Add Role");
        fireEvent.click(addButton);

        // Search for a participant  
        const searchInput = screen.getByPlaceholderText("Search participants by name or email");
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "participant" } });
            await new Promise(resolve => setTimeout(resolve, 600));
        });

        // Wait for search results to appear
        await waitFor(() => {
            const addButtons = screen.queryAllByText("Add");
            expect(addButtons.length).toBeGreaterThan(0);
        });

        // Click Add button for first participant
        const addButtons = screen.getAllByText("Add");
        fireEvent.click(addButtons[0]);

        // Verify API call
        expect(global.fetch).toHaveBeenCalledWith(
            `/api/tournaments/${mockTournamentId}/roles`,
            expect.objectContaining({
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: "user-4",
                    role: "ADMIN"
                })
            })
        );
    });

    it("removes role when clicking Remove button", async () => {
        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        await waitFor(() => {
            const removeButtons = screen.getAllByText("Remove");
            fireEvent.click(removeButtons[0]);
        });

        expect(global.fetch).toHaveBeenCalledWith(
            `/api/tournaments/${mockTournamentId}/roles?userId=user-2`,
            expect.objectContaining({
                method: "DELETE"
            })
        );
    });

    it("updates role when changing dropdown value", async () => {
        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        await waitFor(() => {
            const roleSelects = screen.getAllByRole("combobox");
            fireEvent.change(roleSelects[0], { target: { value: "MODERATOR" } });
        });

        expect(global.fetch).toHaveBeenCalledWith(
            `/api/tournaments/${mockTournamentId}/roles`,
            expect.objectContaining({
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: "user-2",
                    role: "MODERATOR"
                })
            })
        );
    });

    it("displays error message when API call fails", async () => {
        const errorMessage = "Failed to fetch roles";
        global.fetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ message: errorMessage })
            })
        );

        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });

    it("shows loading state while fetching data", async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });

        global.fetch.mockImplementationOnce(() => promise);

        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        expect(screen.getByText("Loading roles...")).toBeInTheDocument();

        await act(async () => {
            resolvePromise({
                ok: true,
                json: () => Promise.resolve(mockRoles)
            });
        });

        await waitFor(() => {
            expect(screen.queryByText("Loading roles...")).not.toBeInTheDocument();
        });
    });

    it("shows no participants found message when search returns no results", async () => {
        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        // Click Add Role to show search form
        const addButton = screen.getByText("Add Role");
        fireEvent.click(addButton);

        // Search for something that doesn't exist
        const searchInput = screen.getByPlaceholderText("Search participants by name or email");
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "xyz" } });
            await new Promise(resolve => setTimeout(resolve, 600));
        });

        expect(screen.getByText("No participants found")).toBeInTheDocument();
    });

    it("filters out users who already have roles", async () => {
        const tournamentWithDuplicates = {
            ...mockTournament,
            participants: [
                ...mockTournament.participants,
                {
                    user: {
                        id: "user-2", // Already has admin role
                        name: "Admin User",
                        email: "admin@example.com"
                    }
                }
            ]
        };

        global.fetch.mockImplementation((url) => {
            if (url.includes("/details")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(tournamentWithDuplicates)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockRoles)
            });
        });

        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        // Click Add Role to show search form  
        const addButton = screen.getByText("Add Role");
        fireEvent.click(addButton);

        // Search
        const searchInput = screen.getByPlaceholderText("Search participants by name or email");
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "participant" } });
            await new Promise(resolve => setTimeout(resolve, 600));
        });

        // Check that participants are displayed but admin user is not
        await waitFor(() => {
            const addButtons = screen.queryAllByText("Add");
            expect(addButtons.length).toBe(2); // Two participants can be added
        });
    });

    it("filters out current user from search results", async () => {
        const tournamentWithCurrentUser = {
            ...mockTournament,
            participants: [
                ...mockTournament.participants,
                {
                    user: mockUser // Current logged in user
                }
            ]
        };

        global.fetch.mockImplementation((url) => {
            if (url.includes("/details")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(tournamentWithCurrentUser)
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockRoles)
            });
        });

        render(<TournamentRoles tournamentId={mockTournamentId} isOwner={true} />);

        // Click Add Role to show search form
        const addButton = screen.getByText("Add Role");
        fireEvent.click(addButton);

        // Search
        const searchInput = screen.getByPlaceholderText("Search participants by name or email");
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: "participant" } });
            await new Promise(resolve => setTimeout(resolve, 600));
        });

        // Check that only the two participants appear
        await waitFor(() => {
            const addButtons = screen.queryAllByText("Add");
            expect(addButtons.length).toBe(2); // Two participants can be added (current user is excluded)
        });
    });
});