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
    if (!showProfileMenu) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest(".profile-menu-container")) {
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
        setError("File size must be less than 2MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      setSelectedFile(file);
      // Create safe object URL
      const safePreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(safePreviewUrl);
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
      setShowProfileUploader(false);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Validate image URL to prevent XSS
  const validateImageUrl = (url) => {
    if (!url) return false;

    // Only allow http/https URLs or blob URLs (for previews)
    return (
      (url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('blob:')) &&
      !url.includes('javascript:')
    );
  };

  // Helper to get rank color classes
  const getRankColorClass = (rank) => {
    const rankLower = (rank || "Bronze").toLowerCase();
    switch (rankLower) {
      case "diamond":
        return "text-blue-500";
      case "platinum":
        return "text-cyan-500";
      case "gold":
        return "text-yellow-500";
      case "silver":
        return "text-gray-400";
      case "bronze":
      default:
        return "text-amber-700";
    }
  };

  return (
    <header className="bg-black">
      <nav className="flex justify-between items-center px-4 lg:px-6 py-2.5 h-16">
        <Link href="/" className={`flex items-center pl-4 lg:pl-6 ${styles.logo}`}>
          <Image
            src={logo}
            alt="Logo"
            width={150}
            height={50}
            quality={100}
            priority
            className="h-auto w-auto"
          />
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
                data-testid="nav-tournaments"
              >
                Tournaments
              </Link>
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-4 min-w-[200px] justify-end">
          {status === "loading" && session?.user ? (
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
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 shadow-inner">
                      {session.user.image && validateImageUrl(session.user.image) ? (
                        <Image
                          src={session.user.image}
                          alt="Profile"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                          {session.user.username?.charAt(0).toUpperCase() ||
                            session.user.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-white">
                        {session.user.username || session.user.email}
                      </span>
                      <span className={`text-xs font-medium ${getRankColorClass(session.user.rank)}`}>
                        {session.user.rank === "Bronze" && "🥉"}
                        {session.user.rank === "Silver" && "🥈"}
                        {session.user.rank === "Gold" && "🥇"}
                        {session.user.rank === "Platinum" && "💎"}
                        {session.user.rank === "Diamond" && "💠"}
                        {session.user.rank === "Master" && "🎖️"}
                        {session.user.rank === "Grandmaster" && "🏆"}
                        {!session.user.rank && "🥉"}
                      </span>
                    </div>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg overflow-hidden z-50 border border-gray-200">
                      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-200 shadow-sm">
                            {session.user.image && validateImageUrl(session.user.image) ? (
                              <Image
                                src={session.user.image}
                                alt="Profile"
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                                {session.user.username?.charAt(0).toUpperCase() ||
                                  session.user.email?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {session.user.username || session.user.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              {session.user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-1">Rank:</span>
                            <span className={`text-xs font-medium ${getRankColorClass(session.user.rank)}`}>
                              {session.user.rank || "Bronze"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-1">Points:</span>
                            <span className="text-xs font-medium text-amber-600">
                              {session.user.points || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href={`/user/${session.user.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowProfileMenu(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          Profile
                        </Link>

                        <button
                          onClick={() => {
                            setShowProfileUploader(true);
                            setShowProfileMenu(false);
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                          </svg>
                          Change Profile Picture
                        </button>

                        <Link
                          href="/settings"
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          Settings
                        </Link>
                      </div>

                      <div className="border-t border-gray-200 py-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm11 4a1 1 0 10-2 0v7.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L14 14.586V7z" clipRule="evenodd" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}

                  {showProfileUploader && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-4 z-50">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                          {previewUrl && validateImageUrl(previewUrl) ? (
                            <div className="relative w-full h-full">
                              {/* Special handling for blob URLs from file preview */}
                              <div className="w-full h-full bg-cover bg-center"
                                style={{ backgroundImage: `url('${previewUrl}')` }}>
                              </div>
                            </div>
                          ) : session.user.image && validateImageUrl(session.user.image) ? (
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