"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import logo from "../Img/logo-removebg-preview.png";
import styles from "./styles/Header.module.css";

export default function Header() {
  const { data: session, status, update } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileUploader, setShowProfileUploader] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest(".profile-menu-container")) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  const handleLogout = async () => {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        setError("File size must be less than 2MB");
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
        console.error("JSON Parse Error:", parseError);
        throw new Error("Failed to parse server response");
      }

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to upload image"
        );
      }

      // Add validation for the imageUrl
      if (!data.imageUrl) {
        throw new Error("Invalid response format: missing imageUrl");
      }

      // Update the session with the new image URL
      await update({
        ...session,
        user: {
          ...session?.user,
          image: data.imageUrl,
        },
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setShowProfileUploader(false);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = status === "loading";

  return (
    <header className="bg-black">
      <nav className="flex justify-between items-center px-4 lg:px-6 py-2.5 h-16">
        <Link href="/" className={`flex items-center ${styles.logo}`}>
          <img src={logo.src} className="h-6 sm:h-9" alt="Logo" />
        </Link>
        <div className="flex-grow flex justify-center -ml-20">
          <ul className="flex space-x-8">
            <li>
              <Link
                href="/"
                className="block py-2 text-gray-400 hover:text-white text-base"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/leaderBoard"
                className="block py-2 text-gray-400 hover:text-white text-base"
              >
                LeaderBoard
              </Link>
            </li>
            <li>
              <Link
                href="/tournament"
                className="block py-2 text-gray-400 hover:text-white text-base"
              >
                Tournaments
              </Link>
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-4 min-w-[200px] justify-end">
          {isLoading ? (
            <div className="flex gap-4">
              <div className="w-20 h-10 bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="w-24 h-10 bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          ) : (
            <>
              {session?.user ? (
                <div className="relative profile-menu-container">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 text-white hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors h-10"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700">
                      {session.user.image ? (
                        <Image
                          src={session.user.image}
                          alt="Profile"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          {session.user.username?.charAt(0).toUpperCase() ||
                            session.user.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-white">
                        {session.user.username || session.user.email}
                      </span>
                      <span className="text-xs text-gray-400">
                        {session.user.rank || "Bronze"}
                      </span>
                    </div>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-900">
                          {session.user.username || session.user.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.user.email}
                        </p>
                      </div>
                      <div className="px-4 py-2 border-b">
                        <p className="text-xs text-gray-500">
                          Rank: {session.user.rank || "Bronze"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Points: {session.user.points || 0}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowProfileUploader(true)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Change Profile Picture
                      </button>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}

                  {showProfileUploader && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-4 z-50">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : session.user.image ? (
                            <Image
                              src={session.user.image}
                              alt="Current profile"
                              width={128}
                              height={128}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-2xl">
                              {session.user.username?.charAt(0).toUpperCase() ||
                                session.user.email?.charAt(0).toUpperCase()}
                            </div>
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

                        {error && (
                          <p className="text-red-500 text-sm">{error}</p>
                        )}

                        <div className="flex gap-2">
                          {selectedFile && (
                            <button
                              onClick={handleUpload}
                              disabled={isUploading}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isUploading ? "Uploading..." : "Upload"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowProfileUploader(false);
                              setSelectedFile(null);
                              setPreviewUrl(null);
                              setError("");
                            }}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-white hover:text-gray-900 hover:bg-white focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 h-10 flex items-center transition-colors duration-200"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="text-white hover:text-gray-900 hover:bg-white focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 h-10 flex items-center transition-colors duration-200"
                  >
                    Get started
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
