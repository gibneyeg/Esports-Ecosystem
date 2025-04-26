"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import Image from "next/image";
import Link from "next/link";

export default function TeamsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [teams, setTeams] = useState([]);
    const [invitationCount, setInvitationCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }

        const fetchTeams = async () => {
            if (status !== "authenticated" || !session?.user?.id) return;

            try {
                setLoading(true);
                const response = await fetch(`/api/teams?userId=${session.user.id}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch teams");
                }

                const data = await response.json();
                setTeams(data.teams || []);
                setInvitationCount(data.pendingInvitations?.length || 0);
            } catch (err) {
                console.error("Error fetching teams:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, [session, status, router]);

    // Helper to get user name display
    const getUserDisplayName = (user) => {
        if (user.name) return user.name;
        if (user.username) return user.username;
        return user.email?.split('@')[0] || "Unknown User";
    };

    // Helper to get role name in readable format
    const getRoleName = (role) => {
        if (role === "OWNER") return "Captain";
        if (role === "ADMIN") return "Manager";
        return "Member";
    };

    // Validate image URL to prevent XSS
    const validateImageUrl = (url) => {
        if (!url) return false;
        return (
            (url.startsWith('http://') ||
                url.startsWith('https://')) &&
            !url.includes('javascript:')
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="max-w-6xl mx-auto p-6">
                    <h1 className="text-3xl font-bold mb-6">My Teams</h1>
                    <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="h-64 bg-gray-200 rounded-lg"></div>
                        <div className="h-64 bg-gray-200 rounded-lg"></div>
                        <div className="h-64 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-6xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">My Teams</h1>
                    <Link
                        href="/teams/create"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Create New Team
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {invitationCount > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <div>
                                    <h2 className="text-lg font-semibold text-blue-800">
                                        You have {invitationCount} pending team invitation{invitationCount !== 1 ? 's' : ''}
                                    </h2>
                                    <p className="text-blue-600">Accept or decline invitations to join teams</p>
                                </div>
                            </div>
                            <Link
                                href="/teams/invitations"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                View Invitations
                            </Link>
                        </div>
                    </div>
                )}

                {teams.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <div className="flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656.126-1.283.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="text-xl text-gray-600 mb-4">You're not a member of any teams yet</p>
                            <Link
                                href="/teams/create"
                                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
                            >
                                Create Your First Team
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team) => {
                            // Find user's role in this team
                            const userMembership = team.members.find(m => m.user.id === session.user.id);
                            const userRole = userMembership?.role || "MEMBER";

                            return (
                                <div key={team.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                    <div className="p-6">
                                        <div className="flex items-center mb-4">
                                            {/* Team Logo */}
                                            <div className="w-12 h-12 rounded-full overflow-hidden mr-4 flex-shrink-0">
                                                {team.logoUrl && validateImageUrl(team.logoUrl) ? (
                                                    <Image
                                                        src={team.logoUrl}
                                                        alt={team.name}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-blue-800 font-bold text-xl">
                                                            {team.tag.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <h2 className="text-xl font-semibold leading-tight">{team.name}</h2>
                                                <p className="text-gray-600 text-sm">[{team.tag}]</p>
                                            </div>
                                        </div>

                                        <div className="mb-4 space-y-2">
                                            <div className="flex items-center text-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656.126-1.283.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span>{team.members.length} Member{team.members.length !== 1 ? 's' : ''}</span>
                                            </div>

                                            <div className="flex items-center text-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                </svg>
                                                <span>Your Role: {getRoleName(userRole)}</span>
                                            </div>

                                            <div className="flex items-center text-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                                <span>Tournaments: {team._count?.tournaments || 0}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Link
                                                href={`/teams/${team.id}`}
                                                className="w-full block text-center py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                            >
                                                View Team
                                            </Link>

                                            {userRole === "OWNER" && (
                                                <Link
                                                    href={`/teams/${team.id}/manage`}
                                                    className="w-full block text-center py-2 px-4 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition"
                                                >
                                                    Manage Team
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Team Invitations section for when there are no invitations */}
                {invitationCount === 0 && (
                    <div className="mt-8">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h2 className="text-xl font-semibold text-blue-800 mb-2">Team Invitations</h2>
                            <p className="text-blue-600 mb-4">
                                You have no pending team invitations.
                            </p>
                            <Link
                                href="/teams/invitations"
                                className="inline-block py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                View Invitations
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
