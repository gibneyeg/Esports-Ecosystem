"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import logo from "../Img/logo-removebg-preview.png";
import styles from "./styles/Header.module.css";

export default function Header() {
  const { data: session, status } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTeamsMenu, setShowTeamsMenu] = useState(false);

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

  useEffect(() => {
    if (!showTeamsMenu) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest(".teams-menu-container")) {
        setShowTeamsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTeamsMenu]);

  const handleLogout = async () => {
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    await signOut({ redirect: true, callbackUrl: "/" });
  };

  const validateImageUrl = (url) => {
    if (!url) return false;
    return (
      (url.startsWith('http://') ||
        url.startsWith('https://')) &&
      !url.includes('javascript:')
    );
  };

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
        <Link href="/" className={`flex items-center mr-4 ${styles.logo}`}>          <Image
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
          <ul className="flex space-x-8 mr-10">
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

            {/* Teams Dropdown - only show when session is loaded */}
            {status !== "loading" && session && (
              <li className="relative teams-menu-container">
                <button
                  onClick={() => setShowTeamsMenu(!showTeamsMenu)}
                  className="block py-2 text-gray-400 hover:text-white text-base flex items-center"
                >
                  Teams
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showTeamsMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-gray-800 text-white rounded-md shadow-lg z-50">
                    <div className="py-1">
                      <Link href="/teams"
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700"
                        onClick={() => setShowTeamsMenu(false)}
                      >
                        My Teams
                      </Link>
                      <Link href="/teams/invitations"
                        className="block px-4 py-2 text-gray-300 hover:bg-gray-700"
                        onClick={() => setShowTeamsMenu(false)}
                      >
                        Team Invitations
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            )}
          </ul>
        </div>
        <div className="flex items-center gap-4 min-w-[200px] justify-end">
          {status === "loading" ? (
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