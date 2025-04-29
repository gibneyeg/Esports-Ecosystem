"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import Link from "next/link";

export default function TeamsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [invitationCount, setInvitationCount] = useState(0);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        async function fetchTeams() {
            try {
                setLoading(true);
                const response = await fetch(`/api/teams?userId=${session?.user?.id}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch teams");
                }

                const data = await response.json();

                // Check if data has a teams property (new API format)
                if (data && data.teams) {
                    setTeams(Array.isArray(data.teams) ? data.teams : []);
                } else {
                    // Fallback for backward compatibility
                    setTeams(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Error fetching teams:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (session?.user?.id) {
            fetchTeams();
        }
    }, [session]);

    if (status === "loading" || (status !== "unauthenticated" && loading)) {
        return (
            <Layout>
                <div className="max-w-6xl mx-auto p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="h-48 bg-gray-200 rounded"></div>
                            <div className="h-48 bg-gray-200 rounded"></div>
                            <div className="h-48 bg-gray-200 rounded"></div>
                        </div>
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
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {Array.isArray(teams) && teams.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.isArray(teams) && teams.map((team) => {
                            // Find user's role in this team
                            const userMembership = team.members.find(m => m.user.id === session?.user?.id);
                            const userRole = userMembership?.role || "MEMBER";

                            return (
                                <div key={team.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                    <div className="p-6">
                                        <div className="flex items-center mb-4">
                                            {team.logoUrl ? (
                                                <img
                                                    src={team.logoUrl}
                                                    alt={team.name}
                                                    className="w-12 h-12 rounded-full mr-4 object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                                                    <span className="text-blue-800 font-bold text-xl">
                                                        {team.tag.substring(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <h2 className="text-xl font-semibold">{team.name}</h2>
                                                <p className="text-gray-600">[{team.tag}]</p>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-center mb-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656.126-1.283.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span>{team.members.length} Members</span>
                                            </div>
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                </svg>
                                                <span>Your Role: {userRole}</span>
                                            </div>
                                        </div>

                                        <Link
                                            href={`/teams/${team.id}`}
                                            className="w-full block text-center py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                        >
                                            View Team
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h2 className="text-xl font-semibold text-blue-800 mb-2">Team Invitations</h2>

                        {invitationCount > 0 ? (
                            <p className="text-blue-600 mb-4">
                                You have {invitationCount} pending team invitation{invitationCount !== 1 ? 's' : ''}.
                            </p>
                        ) : (
                            <p className="text-blue-600 mb-4">
                                You have no pending team invitations.
                            </p>
                        )}

                        <Link
                            href="/teams/invitations"
                            className="inline-block py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            View Invitations
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
}