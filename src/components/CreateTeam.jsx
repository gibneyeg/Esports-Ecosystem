"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "./Layout";
import Image from "next/image";
export default function CreateTeam() {
    const router = useRouter();
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        name: "",
        tag: "",
        description: "",
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [invitedUsers, setInvitedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // Set a maximum team size (this could also be passed as a prop if used for tournament-specific teams)
    const MAX_TEAM_SIZE = 5;

    useEffect(() => {
        // Add a small delay before checking the session
        const timer = setTimeout(() => {
            if (!session) {
                router.push("/login");
            }
        }, 500); // 500ms delay to ensure session is loaded

        return () => clearTimeout(timer);
    }, [session, router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError("Logo must be less than 2MB");
                return;
            }
            setLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const searchUsers = async () => {
        if (!searchQuery.trim() || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);

            if (!response.ok) {
                throw new Error("Failed to search users");
            }

            const data = await response.json();

            // Filter out users who are already invited
            const filteredResults = data.filter(
                (user) => !invitedUsers.some((invited) => invited.id === user.id)
            );

            // Also filter out the current user
            const resultsWithoutCurrentUser = filteredResults.filter(
                (user) => user.id !== session?.user?.id
            );

            setSearchResults(resultsWithoutCurrentUser);
        } catch (err) {
            console.error("Error searching users:", err);
            setError("Failed to search users");
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery) {
                searchUsers();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const inviteUser = (user) => {
        // Check if adding this user would exceed the max team size
        if (invitedUsers.length >= MAX_TEAM_SIZE - 1) {
            setError(`Team cannot have more than ${MAX_TEAM_SIZE} members (including yourself)`);
            return;
        }

        setInvitedUsers((prev) => [...prev, user]);
        setSearchResults(searchResults.filter((u) => u.id !== user.id));
        setSearchQuery("");
        setError(""); // Clear any previous errors
    };

    const removeInvitedUser = (userId) => {
        setInvitedUsers(invitedUsers.filter((user) => user.id !== userId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess("");

        // Validate form
        if (!formData.name.trim() || !formData.tag.trim()) {
            setError("Team name and tag are required");
            setIsLoading(false);
            return;
        }

        if (formData.tag.length < 2 || formData.tag.length > 5) {
            setError("Team tag must be between 2-5 characters");
            setIsLoading(false);
            return;
        }

        try {
            const teamFormData = new FormData();
            teamFormData.append("name", formData.name);
            teamFormData.append("tag", formData.tag);
            teamFormData.append("description", formData.description);

            if (logo) {
                teamFormData.append("logo", logo);
            }

            // Add invited users
            teamFormData.append("invitedUsers", JSON.stringify(invitedUsers.map(user => user.id)));

            const response = await fetch("/api/teams", {
                method: "POST",
                body: teamFormData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create team");
            }

            setSuccess("Team created successfully!");
            setTimeout(() => {
                router.push(`/teams/${data.id}`);
            }, 1500);
        } catch (err) {
            console.error("Error creating team:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate remaining slots
    const remainingSlots = MAX_TEAM_SIZE - invitedUsers.length - 1; // -1 for the creator

    return (
        <Layout>
            <div className="max-w-3xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Create a New Team</h1>

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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block mb-2 font-medium">
                                Team Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter team name"
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="tag" className="block mb-2 font-medium">
                                Team Tag (2-5 characters)
                            </label>
                            <input
                                id="tag"
                                name="tag"
                                type="text"
                                value={formData.tag}
                                onChange={handleChange}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. TSM, C9, 100T"
                                maxLength={5}
                                disabled={isLoading}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This will appear before player names: [{formData.tag}] PlayerName
                            </p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block mb-2 font-medium">
                            Team Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 h-32"
                            placeholder="Tell us about your team"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">Team Logo</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            {logoPreview ? (
                                <div className="space-y-4">
                                    <Image
                                        src={logoPreview}
                                        alt="Logo Preview"
                                        width={192}
                                        height={192}
                                        className="mx-auto rounded-full object-contain"
                                        style={{ maxHeight: '12rem' }}
                                        unoptimized
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLogo(null);
                                            setLogoPreview(null);
                                        }}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Remove Logo
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <svg
                                        className="mx-auto h-12 w-12 text-gray-400"
                                        stroke="currentColor"
                                        fill="none"
                                        viewBox="0 0 48 48"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                                            <span>Upload a logo</span>
                                            <input
                                                type="file"
                                                className="sr-only"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                disabled={isLoading}
                                            />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="font-medium">Team Members</label>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {invitedUsers.length + 1}/{MAX_TEAM_SIZE} Members
                            </span>
                        </div>

                        {/* Team creator info */}
                        <div className="mb-4 bg-green-50 p-3 rounded-md border border-green-200">
                            <div className="flex items-center">
                                {session?.user?.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || session.user.email}
                                        width={40}
                                        height={40}
                                        className="rounded-full mr-3 object-cover"
                                    />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center mr-3">
                                        <span className="text-green-800 font-medium">
                                            {((session?.user?.name || session?.user?.email || "?")[0] || "?").toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <div className="font-medium flex items-center">
                                        {session?.user?.name || session?.user?.email?.split('@')[0]}
                                        <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                            Captain
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">{session?.user?.email}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {remainingSlots > 0 ? (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search users by username or email"
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 pr-8"
                                        disabled={isLoading}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-2.5">
                                            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-center text-yellow-800">
                                    Maximum team size reached ({MAX_TEAM_SIZE} members)
                                </div>
                            )}

                            {searchResults.length > 0 && remainingSlots > 0 && (
                                <div className="bg-white border rounded-md shadow-sm max-h-60 overflow-y-auto">
                                    <ul>
                                        {searchResults.map((user) => (
                                            <li
                                                key={user.id}
                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                                onClick={() => inviteUser(user)}
                                            >
                                                <div className="flex items-center">
                                                    {user.image ? (
                                                        <Image
                                                            src={user.image}
                                                            alt={user.name || user.username}
                                                            width={32}
                                                            height={32}
                                                            className="rounded-full mr-3 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                                            <span className="text-blue-800 font-medium">
                                                                {(user.name || user.username || user.email || "?")[0].toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{user.name || user.username}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="text-blue-600 hover:text-blue-800 flex items-center"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                                    </svg>
                                                    Add
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {searchQuery.length > 0 && searchQuery.length < 3 && (
                                <p className="text-sm text-gray-500">
                                    Please enter at least 3 characters to search
                                </p>
                            )}

                            {invitedUsers.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="font-medium mb-2">Invited Members:</h3>
                                    <div className="space-y-2">
                                        {invitedUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between bg-gray-50 p-2 rounded"
                                            >
                                                <div className="flex items-center">
                                                    {user.image ? (
                                                        <Image
                                                            src={user.image}
                                                            alt={user.name || user.username}
                                                            width={32}
                                                            height={32}
                                                            className="rounded-full mr-3 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                                            <span className="text-blue-800 font-medium">
                                                                {(user.name || user.username || user.email || "?")[0].toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{user.name || user.username}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeInvitedUser(user.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </>
                            ) : (
                                "Create Team"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}