import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfilePictureUploader from "../ProfilePictureUploader";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Mock the next/navigation and next-auth/react modules
vi.mock("next/navigation", () => ({
    useRouter: vi.fn()
}));

vi.mock("next-auth/react", () => ({
    useSession: vi.fn()
}));

describe("ProfilePictureUploader", () => {
    const mockRouter = {
        refresh: vi.fn()
    };

    const mockSession = {
        user: {
            id: "user-1",
            name: "Test User",
            image: "/existingImage.jpg"
        }
    };

    const mockSessionData = {
        data: mockSession,
        update: vi.fn()
    };

    global.fetch = vi.fn();

    const mockFileReader = {
        readAsDataURL: vi.fn(),
        onloadend: null,
        result: "data:image/jpeg;base64,mockImageData"
    };

    global.FileReader = vi.fn(() => mockFileReader);

    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "mock-cloud-name";

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue(mockRouter);
        useSession.mockReturnValue(mockSessionData);
    });

    it("renders the uploader with default user image", () => {
        render(<ProfilePictureUploader />);

        // Should display the current profile image
        const profileImage = screen.getByAltText("Current profile");
        expect(profileImage).toBeInTheDocument();
        expect(profileImage).toHaveAttribute("src", "/existingImage.jpg");

        expect(screen.getByText("Upload a file")).toBeInTheDocument();
    });


    it("validates file size", async () => {
        render(<ProfilePictureUploader />);

        // Create a file larger than max size (5MB)
        const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });
        const input = screen.getByLabelText("Upload a file");

        await act(async () => {
            fireEvent.change(input, { target: { files: [largeFile] } });
        });

        // Should show error message
        expect(screen.getByText("File size must be less than 5MB")).toBeInTheDocument();

        // Should not show preview or upload button
        expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
        expect(screen.queryByText("Upload Picture")).not.toBeInTheDocument();
    });

    // it("allows removing selected image", async () => {
    //     render(<ProfilePictureUploader />);

    //     const file = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
    //     const input = screen.getByLabelText("Upload a file");

    //     await act(async () => {
    //         fireEvent.change(input, { target: { files: [file] } });
    //         mockFileReader.onloadend();
    //     });

    //     // Click remove button
    //     await act(async () => {
    //         fireEvent.click(screen.getByText("Remove Image"));
    //     });

    //     // Should go back to original state
    //     expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
    //     expect(screen.queryByText("Upload Picture")).not.toBeInTheDocument();
    //     expect(screen.getByText("Upload a file")).toBeInTheDocument();
    // });

    it("uploads image to Cloudinary and updates profile", async () => {
        // Mock successful responses
        global.fetch.mockImplementation((url) => {
            if (url.includes("cloudinary.com")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ secure_url: "https://cloudinary.com/uploaded-image.jpg" })
                });
            }

            if (url === "/api/update-profile-picture") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        render(<ProfilePictureUploader />);

        const file = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
        const input = screen.getByLabelText("Upload a file");

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
            mockFileReader.onloadend();
        });

        await act(async () => {
            fireEvent.click(screen.getByText("Upload Picture"));
        });


        // After successful upload
        expect(global.fetch).toHaveBeenCalledWith(
            `https://api.cloudinary.com/v1_1/mock-cloud-name/image/upload`,
            expect.any(Object)
        );

        expect(global.fetch).toHaveBeenCalledWith(
            "/api/update-profile-picture",
            expect.objectContaining({
                method: "POST",
                headers: expect.any(Object),
                body: JSON.stringify({
                    imageUrl: "https://cloudinary.com/uploaded-image.jpg"
                })
            })
        );

        expect(mockSessionData.update).toHaveBeenCalledWith({
            ...mockSession,
            user: {
                ...mockSession.user,
                image: "https://cloudinary.com/uploaded-image.jpg"
            }
        });

        expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it("handles Cloudinary upload error", async () => {
        // Mock failed Cloudinary response
        global.fetch.mockImplementation((url) => {
            if (url.includes("cloudinary.com")) {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: { message: "Cloudinary upload failed" } })
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        render(<ProfilePictureUploader />);

        const file = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
        const input = screen.getByLabelText("Upload a file");

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
            mockFileReader.onloadend();
        });

        await act(async () => {
            fireEvent.click(screen.getByText("Upload Picture"));
        });

        expect(screen.getByText("Cloudinary upload failed")).toBeInTheDocument();

        expect(mockSessionData.update).not.toHaveBeenCalled();
        expect(mockRouter.refresh).not.toHaveBeenCalled();
    });

    it("handles profile update error", async () => {
        // Mock successful Cloudinary but failed profile update
        global.fetch.mockImplementation((url) => {
            if (url.includes("cloudinary.com")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ secure_url: "https://cloudinary.com/uploaded-image.jpg" })
                });
            }

            if (url === "/api/update-profile-picture") {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ error: "Failed to update profile" })
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        render(<ProfilePictureUploader />);

        const file = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
        const input = screen.getByLabelText("Upload a file");

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
            mockFileReader.onloadend();
        });

        await act(async () => {
            fireEvent.click(screen.getByText("Upload Picture"));
        });

        expect(screen.getByText("Failed to update profile")).toBeInTheDocument();
        expect(mockSessionData.update).not.toHaveBeenCalled();
        expect(mockRouter.refresh).not.toHaveBeenCalled();
    });

    it("disables upload button during upload", async () => {
        let resolveCloudinaryPromise;
        global.fetch.mockImplementation((url) => {
            if (url.includes("cloudinary.com")) {
                return new Promise((resolve) => {
                    resolveCloudinaryPromise = resolve;
                });
            }

            return Promise.reject(new Error("Unhandled fetch"));
        });

        render(<ProfilePictureUploader />);

        const file = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
        const input = screen.getByLabelText("Upload a file");

        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
            mockFileReader.onloadend();
        });

        await act(async () => {
            fireEvent.click(screen.getByText("Upload Picture"));
        });

        const uploadingButton = screen.getByText("Uploading...");
        expect(uploadingButton).toBeInTheDocument();
        expect(uploadingButton).toBeDisabled();

        await act(async () => {
            resolveCloudinaryPromise({
                ok: true,
                json: () => Promise.resolve({ secure_url: "https://cloudinary.com/uploaded-image.jpg" })
            });
        });
    });

    it("falls back to default avatar when user has no image", () => {
        useSession.mockReturnValueOnce({
            data: {
                user: { id: "user-1", name: "Test User" }
            },
            update: vi.fn()
        });

        render(<ProfilePictureUploader />);

        // Should display the fallback image
        const profileImage = screen.getByAltText("Current profile");
        expect(profileImage).toBeInTheDocument();
        expect(profileImage).toHaveAttribute("src", "/fakeAvatar.jpg");
    });
});