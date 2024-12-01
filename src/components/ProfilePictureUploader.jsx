import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { uploadProfilePicture } from "@/lib/uploadUtils";

const ProfilePictureUploader = () => {
  const { data: session, update } = useSession();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);
      setError("");

      const data = await uploadProfilePicture(selectedFile);

      // Wait before updating session
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await update({
        ...session,
        user: {
          ...session?.user,
          image: data.imageUrl,
        },
      });

      // Wait after session update before clearing states
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError("Failed to upload image. Please try again.");
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

        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg transition-colors">
          Select Image
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
        </label>

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
