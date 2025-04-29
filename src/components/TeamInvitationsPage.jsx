"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout";

export default function TeamInvitations() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        async function fetchInvitations() {
            try {
                setLoading(true);
                const response = await fetch("/api/teams/invitations");

                if (!response.ok) {
                    throw new Error("Failed to fetch invitations");
                }

                const data = await response.json();
                setInvitations(data);
            } catch (err) {
                console.error("Error fetching invitations:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (session) {
            fetchInvitations();
        }
    }, [session]);

    const handleInvitation = async (invitationId, action) => {
        try {
            setProcessingId(invitationId);

            const response = await fetch("/api/teams/invitations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ invitationId, action }),
            });

            if (!response.ok) {
                throw new Error("Failed to process invitation");
            }

            // Get the response data
            const data = await response.json();

            // Remove processed invitation from the list
            setInvitations(invitations.filter(inv => inv.id !== invitationId));

            if (action === "ACCEPT") {
                // Use the team ID from the response data
                router.push(`/teams/${data.team.id}`);
            }
        } catch (err) {
            console.error("Error processing invitation:", err);
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (status === "loading" || (status !== "unauthenticated" && loading)) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-24 bg-gray-200 rounded"></div>
                        <div className="h-24 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">
                    {invitations.length === 0
                        ? "Team Invitations (0)"
                        : `Team Invitations (${invitations.length})`}
                </h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {invitations.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg">You don't have any pending team invitations</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {invitations.map((invitation) => (
                            <div key={invitation.id} className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            Invitation to join [{invitation.team.tag}] {invitation.team.name}
                                        </h2>
                                        <p className="text-gray-600 mt-1">
                                            Invited by {invitation.team.owner.name || invitation.team.owner.username || invitation.team.owner.email}
                                        </p>
                                        <p className="text-gray-500 text-sm mt-2">
                                            Invited {new Date(invitation.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="space-x-2">
                                        <button
                                            onClick={() => handleInvitation(invitation.id, "ACCEPT")}
                                            disabled={processingId === invitation.id}
                                            className={`px-4 py-2 rounded-md ${processingId === invitation.id
                                                ? "bg-gray-400 cursor-not-allowed"
                                                : "bg-green-600 hover:bg-green-700 text-white"
                                                }`}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleInvitation(invitation.id, "DECLINE")}
                                            disabled={processingId === invitation.id}
                                            className={`px-4 py-2 rounded-md ${processingId === invitation.id
                                                ? "bg-gray-400 cursor-not-allowed"
                                                : "bg-red-600 hover:bg-red-700 text-white"
                                                }`}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}