"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

const TournamentRoles = ({ tournamentId, isOwner }) => {
    const { data: session } = useSession();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedRole, setSelectedRole] = useState('ADMIN');
    const [isSearching, setIsSearching] = useState(false);
    const [tournament, setTournament] = useState(null);

    useEffect(() => {
        if (isOwner) {
            fetchRoles();
            fetchTournamentDetails();
        }
    }, [isOwner, tournamentId]);

    const fetchTournamentDetails = async () => {
        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/details`);
            if (!response.ok) throw new Error('Failed to fetch tournament details');
            const data = await response.json();
            setTournament(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/roles`);
            if (!response.ok) throw new Error('Failed to fetch roles');
            const data = await response.json();
            setRoles(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const searchParticipants = async () => {
        if (!searchQuery.trim() || searchQuery.length < 3 || !tournament) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Get all participants from the tournament
            const participants = tournament.participants || [];

            // Filter participants based on search query
            const matchedParticipants = participants.filter(participant => {
                const user = participant.user;
                const query = searchQuery.toLowerCase();

                const matches = [
                    user.name?.toLowerCase(),
                    user.username?.toLowerCase(),
                    user.email?.toLowerCase()
                ].filter(Boolean).some(field => field.includes(query));

                return matches;
            });

            // Filter out users who already have roles and the current user
            const filteredResults = matchedParticipants
                .map(p => p.user)
                .filter(user =>
                    !roles.some(role => role.userId === user.id) &&
                    user.id !== session?.user?.id
                );

            setSearchResults(filteredResults);
        } catch (err) {
            setError('Failed to search participants');
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery) {
                searchParticipants();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, tournament, roles]);

    const addRole = async (userId) => {
        try {
            setError('');
            const response = await fetch(`/api/tournaments/${tournamentId}/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    role: selectedRole,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to add role');
            }

            await fetchRoles();
            setSearchQuery('');
            setSearchResults([]);
            setIsAdding(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const removeRole = async (userId) => {
        try {
            setError('');
            const response = await fetch(
                `/api/tournaments/${tournamentId}/roles?userId=${userId}`,
                {
                    method: 'DELETE',
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to remove role');
            }

            await fetchRoles();
        } catch (err) {
            setError(err.message);
        }
    };

    const updateRole = async (userId, newRole) => {
        try {
            setError('');
            const response = await fetch(`/api/tournaments/${tournamentId}/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    role: newRole,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to update role');
            }

            await fetchRoles();
        } catch (err) {
            setError(err.message);
        }
    };

    if (!isOwner) return null;

    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Tournament Administrators</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Manage Roles</h3>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            {isAdding ? 'Cancel' : 'Add Role'}
                        </button>
                    </div>

                    {isAdding && (
                        <div className="mb-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Search tournament participants
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Only tournament participants can be given admin or moderator roles
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search participants by name or email"
                                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="MODERATOR">Moderator</option>
                                </select>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="border rounded-md divide-y">
                                    {searchResults.map((user) => (
                                        <div
                                            key={user.id}
                                            className="p-3 flex items-center justify-between hover:bg-gray-50"
                                        >
                                            <div className="flex items-center">
                                                {user.image && (
                                                    <Image
                                                        src={user.image}
                                                        alt={user.name || user.username}
                                                        className="w-8 h-8 rounded-full mr-3"
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-medium">{user.name || user.username}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => addRole(user.id)}
                                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
                                <p className="text-sm text-gray-500">
                                    No participants found
                                </p>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-4">Loading roles...</div>
                    ) : roles.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            No additional roles assigned
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Assigned By
                                    </th>
                                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {roles.map((role) => (
                                    <tr key={role.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {role.user.image && (
                                                    <Image
                                                        src={role.user.image}
                                                        alt={role.user.name || role.user.username}
                                                        className="w-8 h-8 rounded-full mr-3"
                                                    />
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {role.user.name || role.user.username}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{role.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={role.role}
                                                onChange={(e) => updateRole(role.userId, e.target.value)}
                                                className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="ADMIN">Admin</option>
                                                <option value="MODERATOR">Moderator</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {role.createdBy.name || role.createdBy.username}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => removeRole(role.userId)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TournamentRoles;