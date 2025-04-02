"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Layout from "../../../components/Layout.jsx";
import Image from "next/image";
import Link from "next/link";

export default function UserProfile() {
    const params = useParams();
    const { userId } = params;
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(null);
    const [activeTab, setActiveTab] = useState("overview");

    // Fetch user profile data
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setLoading(true);
                setError(null);

                // Pass the current user's ID as a query parameter
                const requesterId = session?.user?.id;
                const url = requesterId
                    ? `/api/users/${userId}?requesterId=${requesterId}`
                    : `/api/users/${userId}`;

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error("Failed to fetch user profile");
                }

                const data = await response.json();
                setProfile(data);
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setError("Could not load user profile. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchUserProfile();
        }
    }, [userId, session]);

    // Validate an image URL
    const validateImageUrl = (url) => {
        if (!url) return false;
        return (
            (url.startsWith('http://') ||
                url.startsWith('https://') ||
                url.startsWith('blob:')) &&
            !url.includes('javascript:')
        );
    };

    // Get rank style colors
    const getRankStyle = (rank) => {
        const styles = {
            'Bronze': {
                bg: 'bg-gradient-to-r from-amber-800 to-amber-700',
                text: 'text-amber-800',
                border: 'border-amber-800',
                lightBg: 'bg-amber-50'
            },
            'Silver': {
                bg: 'bg-gradient-to-r from-gray-400 to-gray-300',
                text: 'text-gray-500',
                border: 'border-gray-400',
                lightBg: 'bg-gray-50'
            },
            'Gold': {
                bg: 'bg-gradient-to-r from-yellow-500 to-yellow-400',
                text: 'text-yellow-600',
                border: 'border-yellow-500',
                lightBg: 'bg-yellow-50'
            },
            'Platinum': {
                bg: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
                text: 'text-cyan-600',
                border: 'border-cyan-500',
                lightBg: 'bg-cyan-50'
            },
            'Diamond': {
                bg: 'bg-gradient-to-r from-blue-500 to-blue-400',
                text: 'text-blue-600',
                border: 'border-blue-500',
                lightBg: 'bg-blue-50'
            },
            'Master': {
                bg: 'bg-gradient-to-r from-purple-600 to-purple-500',
                text: 'text-purple-600',
                border: 'border-purple-600',
                lightBg: 'bg-purple-50'
            },
            'Grandmaster': {
                bg: 'bg-gradient-to-r from-red-600 to-red-500',
                text: 'text-red-600',
                border: 'border-red-600',
                lightBg: 'bg-red-50'
            }
        };
        return styles[rank] || styles['Bronze'];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <Layout>
                <div className="max-w-6xl mx-auto py-8 px-4">
                    <div className="animate-pulse space-y-6">
                        <div className="flex items-center space-x-6">
                            <div className="rounded-full bg-gray-200 h-32 w-32"></div>
                            <div className="space-y-3 flex-1">
                                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="space-y-4">
                            <div className="h-32 bg-gray-200 rounded"></div>
                            <div className="h-64 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="max-w-6xl mx-auto py-8 px-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        <p>{error}</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!profile) {
        return (
            <Layout>
                <div className="max-w-6xl mx-auto py-8 px-4">
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                        <p>User not found</p>
                    </div>
                </div>
            </Layout>
        );
    }

    const isOwnProfile = session?.user?.id === profile.id;
    const rankStyle = getRankStyle(profile.rank);


    const ProfileHeader = () => (
        <div className="bg-gradient-to-b from-black to-gray-900 text-white py-12">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                        {profile.image && validateImageUrl(profile.image) ? (
                            <Image
                                src={profile.image}
                                alt={profile.username || "User"}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-4xl">
                                {(profile.username || profile.name || "U").charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{profile.username || profile.name}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${rankStyle.bg} text-white`}>
                                {profile.rank}
                            </span>
                            <span className="text-gray-300">
                                {profile.points} points
                            </span>
                            <span className="text-gray-300">
                                Member since {formatDate(profile.createdAt)}
                            </span>
                            {profile.isProfilePrivate && !isOwnProfile && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Private Profile
                                </span>
                            )}
                        </div>
                        {isOwnProfile && (
                            <Link
                                href="/settings"
                                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Edit Profile
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Handle private profile
    if (profile.isPrivate && !isOwnProfile) {
        return (
            <Layout>
                <ProfileHeader />

                <div className="max-w-6xl mx-auto py-12 px-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h2 className="text-2xl font-bold mb-3">This profile is private</h2>
                        <p className="text-gray-600">
                            {profile.username || profile.name} has chosen to keep their tournament history and results private.
                        </p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <ProfileHeader />

            <div className="max-w-6xl mx-auto py-6 px-4">
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('tournaments')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tournaments'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Tournaments
                        </button>
                        <button
                            onClick={() => setActiveTab('results')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'results'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Results
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-xl font-bold mb-4">Player Statistics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-500">Total Tournaments</p>
                                    <p className="text-2xl font-bold">{profile.tournaments?.length || 0}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-500">Tournaments Won</p>
                                    <p className="text-2xl font-bold">{profile.tournamentWins?.filter(win => win.position === 1).length || 0}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-500">Total Earnings</p>
                                    <p className="text-2xl font-bold">${profile.totalWinnings?.toLocaleString() || "0"}</p>
                                </div>
                            </div>
                        </div>

                        {profile.recentResults && profile.recentResults.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h2 className="text-xl font-bold mb-4">Recent Results</h2>
                                <div className="space-y-3">
                                    {profile.recentResults.map((result, index) => (
                                        <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                                            <Link href={`/tournament/${result.tournamentId}`} className="hover:text-blue-600">
                                                <div className="flex justify-between">
                                                    <div>
                                                        <p className="font-medium">{result.tournamentName}</p>
                                                        <p className="text-sm text-gray-500">{formatDate(result.date)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold ${result.position === 1 ? 'text-yellow-600' :
                                                            result.position === 2 ? 'text-gray-600' :
                                                                result.position === 3 ? 'text-amber-700' : 'text-gray-600'
                                                            }`}>
                                                            {result.position === 1 ? '1st Place 🏆' :
                                                                result.position === 2 ? '2nd Place 🥈' :
                                                                    result.position === 3 ? '3rd Place 🥉' : `${result.position}th Place`}
                                                        </p>
                                                        {result.prizeMoney > 0 && (
                                                            <p className="text-sm text-green-600">${result.prizeMoney.toLocaleString()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tournaments' && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-bold mb-4">Tournament History</h2>
                        {profile.tournaments && profile.tournaments.length > 0 ? (
                            <div className="space-y-4">
                                {profile.tournaments.map(tournament => (
                                    <div key={tournament.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <Link href={`/tournament/${tournament.id}`} className="block">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-lg">{tournament.name}</h3>
                                                    <p className="text-sm text-gray-500">{tournament.game}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {formatDate(tournament.startDate)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${tournament.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                                                        tournament.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                        {tournament.status}
                                                    </span>
                                                    {tournament.playerPosition && (
                                                        <p className={`mt-2 font-bold ${tournament.playerPosition === 1 ? 'text-yellow-600' :
                                                            tournament.playerPosition === 2 ? 'text-gray-600' :
                                                                tournament.playerPosition === 3 ? 'text-amber-700' : 'text-gray-600'
                                                            }`}>
                                                            {tournament.playerPosition === 1 ? '1st Place 🏆' :
                                                                tournament.playerPosition === 2 ? '2nd Place 🥈' :
                                                                    tournament.playerPosition === 3 ? '3rd Place 🥉' :
                                                                        tournament.playerPosition ? `${tournament.playerPosition}th Place` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">No tournament history available.</p>
                        )}
                    </div>
                )}

                {activeTab === 'results' && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-bold mb-4">Tournament Results</h2>
                        {profile.tournamentWins && profile.tournamentWins.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tournament
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Position
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Prize
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {profile.tournamentWins.map(win => (
                                            <tr key={win.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Link href={`/tournament/${win.tournamentId}`} className="text-blue-600 hover:text-blue-800">
                                                        {win.tournamentName}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(win.date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${win.position === 1 ? 'bg-yellow-100 text-yellow-800' :
                                                        win.position === 2 ? 'bg-gray-100 text-gray-800' :
                                                            win.position === 3 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {win.position === 1 ? '1st Place 🏆' :
                                                            win.position === 2 ? '2nd Place 🥈' :
                                                                win.position === 3 ? '3rd Place 🥉' : `${win.position}th Place`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                                    ${win.prizeMoney.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500">No tournament results available.</p>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}