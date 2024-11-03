'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import logo from "../Img/fakeLogo1.jpeg";
import styles from "./styles/Header.module.css";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      setIsLoggedIn(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <header className="bg-black">
      <nav className="flex justify-between items-center px-4 lg:px-6 py-2.5 h-16"> {/* Fixed height */}
        <Link href="/" className={`flex items-center ${styles.logo}`}>
          <img src={logo.src} className="h-6 sm:h-9" alt="Fake Logo" />
        </Link>
        
        <div className="flex-grow flex justify-center">
          <ul className="flex space-x-8">
            <li>
              <Link href="/" className="block py-2 text-gray-400 hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link href="/About" className="block py-2 text-gray-400 hover:text-white">
                Company
              </Link>
            </li>
            <li>
              <Link href="/leaderBoard" className="block py-2 text-gray-400 hover:text-white">
                LeaderBoard
              </Link>
            </li>
            <li>
              <Link href="/tournament" className="block py-2 text-gray-400 hover:text-white">
                tournaments
              </Link>
            </li>
            <li>
              <Link href="/Contact" className="block py-2 text-gray-400 hover:text-white">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-4">
          {!isLoading && (
            <>
              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 text-white hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors"
                  >
                    {avatarError ? (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <img
                        src="/avatars/default-avatar.png"
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{user?.username}</span>
                      <span className="text-xs text-gray-400">{user?.rank}</span>
                    </div>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <div className="px-4 py-2 border-b">
                        <p className="text-xs text-gray-500">Rank: {user?.rank}</p>
                        <p className="text-xs text-gray-500">Points: {user?.points}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-800 hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 text-white"
                  >
                    Log in
                  </Link>
                  <Link
                    href="#"
                    className="text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5"
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