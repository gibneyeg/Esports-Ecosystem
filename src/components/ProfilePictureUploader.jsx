"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
const router = useRouter();



const ProfilePictureUploader = () => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const validateFile = (file) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 5MB');
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('Please select a valid image file (JPEG, PNG, or WebP)');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validateFile(file);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      setError("");
    } catch (err) {
      setError(err.message);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("upload_preset", "profile_pictures");
      formData.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Upload failed");
      }

      // Update user profile
      const updateResponse = await fetch("/api/update-profile-picture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: data.secure_url,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update profile");
      }

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          image: data.secure_url,
        },
      });

      // Reset states
      setSelectedFile(null);
      setPreviewUrl(null);
      
      router.refresh();
    } catch (err) {
      setError(err.message || "Failed to upload image");
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={session?.user?.image || "/fakeAvatar.jpg"}
              alt="Current profile"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="mx-auto max-h-48 rounded"
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="text-red-600 hover:text-red-800"
              >
                Remove Image
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600 justify-center">
                <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {selectedFile && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? "Uploading..." : "Upload Picture"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfilePictureUploader;
