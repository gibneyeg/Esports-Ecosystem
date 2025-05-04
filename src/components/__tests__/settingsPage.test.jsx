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

        // Wait for the input to be rendered
        await act(async () => {
            // Wait a bit for the data to load
        });

        const usernameInput = screen.getByDisplayValue("testuser");
        await act(async () => {
            fireEvent.change(usernameInput, { target: { value: "newusername" } });
        });

        const updateButton = screen.getByText("Update Profile");
        await act(async () => {
            fireEvent.click(updateButton);
        });

        // Check if API was called
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

    it("handles loading state correctly", async () => {
        // Mock session with data but userData as null initially
        useSession.mockReturnValueOnce({
            data: { user: { id: "user-1" } },
            update: vi.fn()
        });

        await act(async () => {
            render(<SettingsPage />);
        });

        // Check if loading animation is shown
        expect(screen.getByText("Account Settings")).toBeInTheDocument();
        // Loading animation should be visible
        const animatedElements = screen.getAllByText(/Account Settings/)[0].closest('div');
        expect(animatedElements).toBeInTheDocument();
    });

    it("handles file upload successfully", async () => {
        // Mock URL methods for file preview
        const mockObjectUrl = 'blob:http://localhost:3000/mock-url';
        global.URL.createObjectURL = vi.fn(() => mockObjectUrl);
        global.URL.revokeObjectURL = vi.fn();

        global.fetch.mockImplementation((url) => {
            if (url === `/api/users/${mockUser.id}`) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUser)
                });
            }

            if (url === "/api/upload-profile-picture") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ imageUrl: 'https://example.com/image.jpg' })
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        await act(async () => {
            render(<SettingsPage />);
        });

        // Create a mock file
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

        // Find the file input - the label contains the input
        const fileInputLabel = screen.getByText('Select Image');
        const fileInput = fileInputLabel.querySelector('input[type="file"]');

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
        });

        // Wait for the upload button to appear
        const uploadButton = await screen.findByText('Upload');
        await act(async () => {
            fireEvent.click(uploadButton);
        });

        // Wait for the success message
        await act(async () => {
            expect(await screen.findByText('Profile picture updated successfully')).toBeInTheDocument();
        });
    });

    it("handles file size error", async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        // Create a large mock file (> 2MB)
        const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

        const fileInput = screen.getByText('Select Image').querySelector('input[type="file"]');

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [largeFile] } });
        });

        // Check for error message
        expect(screen.getByText('File size must be less than 2MB')).toBeInTheDocument();
    });

    it("validates image file type", async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        // Create a non-image file
        const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });

        const fileInputLabel = screen.getByText('Select Image');
        const fileInput = fileInputLabel.querySelector('input[type="file"]');

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [textFile] } });
        });

        // Check for error message
        expect(screen.getByText('Please select an image file')).toBeInTheDocument();
    });

    it("allows email change", async () => {
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
                        username: mockUser.username,
                        email: "newemail@example.com"
                    })
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        await act(async () => {
            render(<SettingsPage />);
        });

        // Update the new email field
        const newEmailInput = screen.getByPlaceholderText("Enter new email");
        await act(async () => {
            fireEvent.change(newEmailInput, { target: { value: "newemail@example.com" } });
        });

        const updateButton = screen.getByText("Update Profile");
        await act(async () => {
            fireEvent.click(updateButton);
        });

        // Verify the API was called with the new email
        const updateCall = global.fetch.mock.calls.find(
            call => call[0] === "/api/users/update-profile"
        );

        expect(updateCall).toBeDefined();
        const requestBody = JSON.parse(updateCall[1].body);
        expect(requestBody.email).toBe("newemail@example.com");
    });
});