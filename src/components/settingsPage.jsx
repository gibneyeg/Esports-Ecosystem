"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProfilePrivate, setIsProfilePrivate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [userData, setUserData] = useState(null);

  // Profile picture states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/users/${session.user.id}`);
        if (!response.ok) throw new Error("Failed to fetch user data");

        const data = await response.json();
        setUserData(data);

        // Set form values
        setUsername(data.username || "");
        setCurrentEmail(data.email || "");
        setIsProfilePrivate(data.isProfilePrivate || false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setMessage({ type: "error", text: "Failed to load user data" });
      }
    };

    if (session?.user) {
      fetchUserData();
    } else if (session === null) {
      // User is not logged in
      router.push("/login");
    }
  }, [session, router]);

  // Validate image URL to prevent XSS
  const validateImageUrl = (url) => {
    if (!url) return false;
    return (
      (url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('blob:')) &&
      !url.includes('javascript:')
    );
  };

  const updateUserProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Validate form
      if (newPassword && newPassword !== confirmPassword) {
        setMessage({ type: "error", text: "Passwords do not match" });
        setLoading(false);
        return;
      }

      const updateData = { username };

      // Only include email if it's being changed
      if (newEmail && newEmail !== currentEmail) {
        updateData.email = newEmail;
      }

      // Only include password if it's being changed
      if (newPassword && currentPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      // Update user profile
      const response = await fetch("/api/users/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Update session
      await update({
        ...session,
        user: {
          ...session.user,
          username: data.username,
          email: data.email || session.user.email,
        },
      });

      setMessage({ type: "success", text: "Profile updated successfully" });

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/users/update-privacy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isProfilePrivate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update privacy settings");
      }

      setMessage({ type: "success", text: "Privacy settings updated successfully" });
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("File size must be less than 2MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        return;
      }
      setSelectedFile(file);
      const safePreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(safePreviewUrl);
      setUploadError("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadError("");
      setUploadSuccess("");

      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/upload-profile-picture", {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error("Failed to parse server response");
      }

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to upload image"
        );
      }

      if (!data.imageUrl) {
        throw new Error("Invalid response format: missing imageUrl");
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          image: data.imageUrl,
        },
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadSuccess("Profile picture updated successfully");
      setTimeout(() => setUploadSuccess(""), 3000);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Failed to upload image. Please try again.");
      setTimeout(() => setUploadError(""), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  if (!session || !userData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-md ${message.type === "error"
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-green-50 text-green-700 border border-green-200"
            }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Picture Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Profile Picture</h2>

        <div className="flex items-center gap-8">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
            {previewUrl && validateImageUrl(previewUrl) ? (
              <div className="relative w-full h-full">
                {/* Special handling for blob URLs from file preview */}
                <div className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url('${previewUrl}')` }}>
                </div>
              </div>
            ) : session?.user?.image && validateImageUrl(session.user.image) ? (
              <Image
                src={session.user.image}
                alt="Current profile"
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-600 text-3xl">
                {session?.user?.username?.charAt(0).toUpperCase() ||
                  session?.user?.email?.charAt(0).toUpperCase() ||
                  "U"}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors inline-block">
              Select Image
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </label>

            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className={`px-4 py-2 rounded-lg transition-colors ${isUploading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                  } text-white`}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            )}

            {uploadError && (
              <p className="text-red-500 text-sm">{uploadError}</p>
            )}

            {uploadSuccess && (
              <p className="text-green-500 text-sm">{uploadSuccess}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Profile Information</h2>

        <form onSubmit={updateUserProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Email
            </label>
            <input
              type="email"
              value={currentEmail}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Email (leave blank to keep current)
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new email"
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium mb-4">Change Password</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6">Privacy Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isProfilePrivate"
              checked={isProfilePrivate}
              onChange={(e) => setIsProfilePrivate(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="isProfilePrivate" className="ml-2 block text-sm text-gray-700">
              Make my profile private
            </label>
          </div>

          <div className="ml-6 text-sm text-gray-500">
            When enabled, your tournament history and results will be hidden from other users.
            Other users will still be able to see your username, rank, and points.
          </div>

          <div className="mt-4">
            <button
              onClick={updatePrivacySettings}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Save Privacy Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}