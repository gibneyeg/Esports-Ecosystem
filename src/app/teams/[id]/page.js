"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout";
import Image from "next/image";
import Link from "next/link";

export default function TeamDetailPage({ params }) {
    const router = useRouter();
    const teamId = params.id;
    const { data: session } = useSession();
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchTeam() {
            try {
                setLoading(true);
                const response = await fetch(`/api/teams/${teamId}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch team data");
                }

                const data = await response.json();
                setTeam(data);
            } catch (err) {
                console.error("Error fetching team:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (teamId) {
            fetchTeam();
        }
    }, [teamId]);

    // Add the missing deleteTeam function
    const deleteTeam = async () => {
        try {
            const response = await fetch(`/api/teams/${teamId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to delete team");
            }

            // Redirect to teams page after successful deletion
            router.push("/teams");
        } catch (err) {
            console.error("Error deleting team:", err);
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto p-6">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
                        <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto p-6">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                </div>
            </Layout>
        );
    }

    if (!team) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto p-6">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        Team not found
                    </div>
                </div>
            </Layout>
        );
    }

    const isTeamOwner = session?.user?.id === team.ownerId;

    return (
        <Layout>
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-start gap-6">
                        <div className="flex-shrink-0">
                            {team.logoUrl ? (
                                <img
                                    src={team.logoUrl}
                                    alt={team.name}
                                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-4xl text-blue-800 font-bold border-4 border-gray-200">
                                    {team.tag.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-800">
                                [{team.tag}] {team.name}
                            </h1>

                            {isTeamOwner && (
                                <div className="mt-2">
                                    <Link
                                        href={`/teams/${team.id}/edit`}
                                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit Team
                                    </Link>
                                </div>
                            )}

                            <div className="mt-4">
                                <p className="text-gray-600">{team.description}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <h2 className="text-xl font-semibold mb-4">Team Members</h2>
                        <div className="space-y-3">
                            {team.members?.map(member => (
                                <div key={member.id} className="bg-gray-50 p-3 rounded-md flex items-center justify-between">
                                    <div className="flex items-center">
                                        {member.user?.image ? (
                                            <img
                                                src={member.user.image}
                                                alt={member.user.name || member.user.username}
                                                className="w-10 h-10 rounded-full mr-3"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                                <span className="text-gray-700 font-medium">
                                                    {(member.user?.name?.charAt(0) || member.user?.username?.charAt(0) || member.user?.email?.charAt(0) || "?").toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        <div>
                                            <div className="font-medium flex items-center">
                                                {member.user?.name || member.user?.username || member.user?.email?.split('@')[0]}
                                                {member.role === "OWNER" && (
                                                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Captain</span>
                                                )}
                                                {member.role === "ADMIN" && (
                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Admin</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">{member.user?.email}</div>
                                        </div>
                                    </div>

                                    <div className="text-sm text-gray-500">
                                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}

                            {(!team.members || team.members.length === 0) && (
                                <p className="text-gray-500">No team members found</p>
                            )}
                        </div>
                    </div>

                    {isTeamOwner && (
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => window.confirm("Are you sure you want to delete this team?") && deleteTeam()}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Delete Team
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}