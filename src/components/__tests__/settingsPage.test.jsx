import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import SettingsPage from "../settingsPage";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Mock the next/navigation and next-auth/react modules
vi.mock("next/navigation", () => ({
    useRouter: vi.fn()
}));

vi.mock("next-auth/react", () => ({
    useSession: vi.fn()
}));

// Mock next/image component
vi.mock("next/image", () => ({
    default: (props) => {
        return <img {...props} />;
    }
}));

describe("SettingsPage", () => {
    const mockRouter = {
        push: vi.fn()
    };

    const mockUser = {
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        isProfilePrivate: false
    };

    const mockSession = {
        user: {
            id: "user-1",
            username: "testuser",
            email: "test@example.com"
        }
    };

    const mockSessionData = {
        data: mockSession,
        update: vi.fn()
    };

    global.fetch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue(mockRouter);
        useSession.mockReturnValue(mockSessionData);

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockUser)
        });
    });

    it("redirects to login if user is not authenticated", async () => {
        useSession.mockReturnValueOnce({ data: null });

        await act(async () => {
            render(<SettingsPage />);
        });

        expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });

    it("fetches and displays user data on mount", async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        expect(global.fetch).toHaveBeenCalledWith(`/api/users/${mockUser.id}`);
        expect(screen.getByDisplayValue("testuser")).toBeInTheDocument();
        expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    });


    it("updates username when form is submitted", async () => {
        global.fetch.mockImplementation((url) => {
            if (url === `/api/users/${mockUser.id}`) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUser)
                });
            }

            if (url === "/api/users/update-profile") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        username: "newusername",
                        email: mockUser.email
                    })
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        await act(async () => {
            render(<SettingsPage />);
        });

        const usernameInput = screen.getByDisplayValue("testuser");
        await act(async () => {
            fireEvent.change(usernameInput, { target: { value: "newusername" } });
        });

        const updateButton = screen.getByText("Update Profile");
        await act(async () => {
            fireEvent.click(updateButton);
        });

        // Check if   API was called
        expect(global.fetch).toHaveBeenCalledWith("/api/users/update-profile", expect.any(Object));

        expect(mockSessionData.update).toHaveBeenCalled();

        expect(screen.getByText("Profile updated successfully")).toBeInTheDocument();
    });

    it("displays error message when profile update fails", async () => {
        const errorMessage = "Failed to update profile";

        global.fetch.mockImplementation((url) => {
            if (url === `/api/users/${mockUser.id}`) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUser)
                });
            }

            if (url === "/api/users/update-profile") {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: errorMessage })
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        await act(async () => {
            render(<SettingsPage />);
        });

        const usernameInput = screen.getByDisplayValue("testuser");
        await act(async () => {
            fireEvent.change(usernameInput, { target: { value: "newusername" } });
        });

        const updateButton = screen.getByText("Update Profile");
        await act(async () => {
            fireEvent.click(updateButton);
        });

        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("shows error when passwords don't match", async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        const currentPasswordInput = screen.getByPlaceholderText("Enter current password");
        await act(async () => {
            fireEvent.change(currentPasswordInput, { target: { value: "currentpass" } });
        });

        const newPasswordInput = screen.getByPlaceholderText("Enter new password");
        await act(async () => {
            fireEvent.change(newPasswordInput, { target: { value: "newpass" } });
        });

        const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");
        await act(async () => {
            fireEvent.change(confirmPasswordInput, { target: { value: "differentpass" } });
        });

        // Submit form
        const updateButton = screen.getByText("Update Profile");
        await act(async () => {
            fireEvent.click(updateButton);
        });

        // Check error message
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();

    });


    it("updates privacy settings when Save Privacy Settings is clicked", async () => {
        global.fetch.mockImplementation((url) => {
            if (url === `/api/users/${mockUser.id}`) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUser)
                });
            }

            if (url === "/api/users/update-privacy") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ isProfilePrivate: true })
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        await act(async () => {
            render(<SettingsPage />);
        });

        // Toggle privacy checkbox
        const privacyCheckbox = screen.getByLabelText("Make my profile private");
        await act(async () => {
            fireEvent.click(privacyCheckbox);
        });

        const savePrivacyButton = screen.getByText("Save Privacy Settings");
        await act(async () => {
            fireEvent.click(savePrivacyButton);
        });

        expect(screen.getByText("Privacy settings updated successfully")).toBeInTheDocument();
    });

});