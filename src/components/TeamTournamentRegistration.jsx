"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
export default function TeamTournamentRegistration({ tournamentId, formatSettings, isRegistrationOpen }) {
    const { data: session } = useSession();
    const [userTeams, setUserTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoadingTeams, setIsLoadingTeams] = useState(true);

    const requiredTeamSize = formatSettings?.teamSize || 2;
    const allowPartialTeams = formatSettings?.allowPartialTeams || false;

    // Fetch user's teams
    useEffect(() => {
        const fetchUserTeams = async () => {
            if (!session?.user?.id) return;

            try {
                setIsLoadingTeams(true);
                const response = await fetch(`/api/teams?userId=${session.user.id}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch teams");
                }

                const responseData = await response.json();

                // Handle both possible API response formats
                let teamsData = responseData;
                if (responseData.teams) {
                    // New API format returns {teams: [...]}
                    teamsData = responseData.teams;
                } else if (!Array.isArray(responseData)) {
                    // If it's not an array and doesn't have teams property
                    console.error("Unexpected API response format:", responseData);
                    setError("Unexpected data format from API");
                    setUserTeams([]);
                    setIsLoadingTeams(false);
                    return;
                }

                // Only include teams where the user is owner or admin
                const eligibleTeams = teamsData.filter(team => {
                    const userMembership = team.members.find(member =>
                        member.user.id === session.user.id
                    );
                    return userMembership && (userMembership.role === "OWNER" || userMembership.role === "ADMIN");
                });

                setUserTeams(eligibleTeams);
            } catch (err) {
                console.error("Error fetching teams:", err);
                setError(err.message);
            } finally {
                setIsLoadingTeams(false);
            }
        };

        fetchUserTeams();
    }, [session]);

    const handleRegisterTeam = async () => {
        if (!selectedTeamId) {
            setError("Please select a team to register");
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/team-participate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    teamId: selectedTeamId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to register team");
            }

            setSuccess("Team successfully registered for tournament!");

            // You might want to trigger a refresh of the parent component here
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (err) {
            console.error("Error registering team:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Team is ineligible if it doesn't meet the size requirements
    const isTeamEligible = (team) => {
        if (allowPartialTeams) return true;
        return team.members.length >= requiredTeamSize;
    };

    if (!session) {
        return (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800">Team Tournament</h3>
                <p className="text-blue-600 mt-1">Please sign in to register your team for this tournament.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-xl font-bold mb-4">Register Your Team</h3>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            <div className="mb-4">
                <div className="flex items-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-600">
                        This tournament requires teams of {requiredTeamSize} players
                        {allowPartialTeams && " (partial teams allowed)"}
                    </p>
                </div>

                {/* Owner requirement notice */}
                <div className="flex items-center mb-3 bg-yellow-50 p-2 rounded border border-yellow-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-yellow-700 font-medium">
                        You must be the Owner or Admin of a team to register it for this tournament.
                    </p>
                </div>
            </div>

            {isLoadingTeams ? (
                <div className="text-center py-6">
                    <svg className="animate-spin h-8 w-8 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-2 text-gray-600">Loading your teams...</p>
                </div>
            ) : userTeams.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="mt-2 text-gray-600">You don't have any teams that you own or teams of the right size</p>
                    <p className="mt-1 text-sm text-gray-500">You must be the Owner or Admin of a team to register it</p>
                    <Link
                        href="/teams/create"
                        className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Create a Team
                    </Link>
                </div>
            ) : (
                <>
                    <div className="mb-6">
                        <label className="block mb-2 font-medium">Select Team to Register</label>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                            {userTeams.map((team) => {
                                const eligible = isTeamEligible(team);

                                return (
                                    <div
                                        key={team.id}
                                        className={`border rounded-lg p-3 transition duration-150 ${selectedTeamId === team.id
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-blue-300"
                                            } ${!eligible && "opacity-60"}`}
                                        onClick={() => eligible && setSelectedTeamId(team.id)}
                                    >
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 mr-3">
                                                {team.logoUrl ? (
                                                    <Image
                                                        src={team.logoUrl}
                                                        alt={team.name}
                                                        width={40}
                                                        height={40}
                                                        className="rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <span className="text-gray-500 font-bold">
                                                            {team.tag.slice(0, 2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium">
                                                    [{team.tag}] {team.name}
                                                </h4>
                                                <p className="text-sm text-gray-500">
                                                    {team.members.length} member{team.members.length !== 1 && "s"}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 ml-2">
                                                <input
                                                    type="radio"
                                                    name="team"
                                                    checked={selectedTeamId === team.id}
                                                    onChange={() => eligible && setSelectedTeamId(team.id)}
                                                    disabled={!eligible}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {!eligible && (
                                            <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">
                                                Need at least {requiredTeamSize} members to participate
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={handleRegisterTeam}
                        disabled={isLoading || !selectedTeamId || !isRegistrationOpen}
                        className={`w-full py-2 px-4 rounded-md font-medium text-center ${isLoading || !selectedTeamId || !isRegistrationOpen
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Registering...
                            </span>
                        ) : !isRegistrationOpen ? (
                            "Registration is closed"
                        ) : (
                            "Register Team"
                        )}
                    </button>
                </>
            )}
        </div>
    );
}