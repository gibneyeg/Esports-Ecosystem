"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import GameSelector from "@/components/GameSelector";
import TournamentFormatSelector from "@/components/TournamentFormatSelector";
import FormatSettings from "@/components/FormatSettings";

export default function EditTournament({ params }) {
    const tournamentId = params.id;
    const router = useRouter();
    const { data: session, status } = useSession();
    const [tournament, setTournament] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        registrationCloseDate: "",
        prizePool: "",
        maxPlayers: "",
        game: "",
        format: "",
        seedingType: "RANDOM",
        rules: "",
        numberOfRounds: "",
        groupSize: "",
        streamEmbed: true,
        streamUrl: "",
        // Team-related fields
        registrationType: "INDIVIDUAL",
        teamSize: "2",
        allowPartialTeams: false,
        teamsCanRegisterAfterStart: false,
        requireTeamApproval: false,
    });
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch tournament data
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }

        const fetchTournament = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/tournaments/${tournamentId}/details`);

                if (!response.ok) {
                    throw new Error("Failed to fetch tournament details");
                }

                const data = await response.json();
                setTournament(data);

                // Format dates properly for datetime-local inputs
                const formatDateForInput = (dateString) => {
                    if (!dateString) return "";
                    const date = new Date(dateString);
                    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
                };

                setFormData({
                    name: data.name || "",
                    description: data.description || "",
                    startDate: formatDateForInput(data.startDate),
                    endDate: formatDateForInput(data.endDate),
                    registrationCloseDate: formatDateForInput(data.registrationCloseDate),
                    prizePool: data.prizePool?.toString() || "",
                    maxPlayers: data.maxPlayers?.toString() || "",
                    game: data.game || "",
                    format: data.format || "",
                    seedingType: data.seedingType || "RANDOM",
                    rules: data.rules || "",
                    numberOfRounds: data.formatSettings?.numberOfRounds?.toString() || "",
                    groupSize: data.formatSettings?.groupSize?.toString() || "",
                    streamEmbed: data.streamEmbed !== false, // Default to true if not specified
                    streamUrl: data.streamUrl || "",
                    // Team-related fields
                    registrationType: data.formatSettings?.registrationType || "INDIVIDUAL",
                    teamSize: data.formatSettings?.teamSize?.toString() || "2",
                    allowPartialTeams: data.formatSettings?.allowPartialTeams || false,
                    teamsCanRegisterAfterStart: data.formatSettings?.teamsCanRegisterAfterStart || false,
                    requireTeamApproval: data.formatSettings?.requireTeamApproval || false,
                });

                // Set image preview if tournament has an image
                if (data.imageUrl) {
                    setImagePreview(data.imageUrl);
                }

            } catch (err) {
                console.error("Error fetching tournament:", err);
                setError("Failed to load tournament data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        if (tournamentId && session) {
            fetchTournament();
        }
    }, [tournamentId, session, status, router]);

    const validateTwitchUrl = (url) => {
        if (!url) return true; // Optional field
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'twitch.tv' || urlObj.hostname === 'www.twitch.tv';
        } catch {
            return false;
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError("Image must be less than 5MB");
                return;
            }
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError("");
        setSuccess("");

        // Validate dates
        const startTime = new Date(formData.startDate).getTime();
        const endTime = new Date(formData.endDate).getTime();
        const registrationCloseTime = new Date(formData.registrationCloseDate).getTime();

        if (registrationCloseTime >= startTime) {
            setError("Registration must close before tournament starts");
            setIsSubmitting(false);
            return;
        }

        if (startTime >= endTime) {
            setError("End date must be after start date");
            setIsSubmitting(false);
            return;
        }

        // Validate Twitch URL if provided
        if (formData.streamUrl && !validateTwitchUrl(formData.streamUrl)) {
            setError("Please enter a valid Twitch URL");
            setIsSubmitting(false);
            return;
        }

        // Validate team settings
        if (formData.registrationType === "TEAM") {
            const teamSize = parseInt(formData.teamSize);
            if (teamSize < 2 || teamSize > 10) {
                setError("Team size must be between 2 and 10 players");
                setIsSubmitting(false);
                return;
            }
        }

        try {
            const formDataToSend = new FormData();
            Object.keys(formData).forEach((key) => {
                formDataToSend.append(key, formData[key]);
            });

            if (image) {
                formDataToSend.append("image", image);
            }

            const response = await fetch(`/api/tournaments/${tournamentId}`, {
                method: "PUT",
                body: formDataToSend,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update tournament");
            }

            setSuccess("Tournament updated successfully!");

            // Redirect after a short delay
            setTimeout(() => {
                router.push(`/tournament/${tournamentId}`);
            }, 2000);

        } catch (err) {
            console.error("Error updating tournament:", err);
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    // Show team settings if registration type is TEAM
    const isTeamTournament = formData.registrationType === "TEAM";

    if (loading) {
        return (
            <Layout>
                <div className="max-w-2xl mx-auto p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Edit Tournament</h1>

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
                    {/* Basic tournament information */}
                    <div>
                        <label htmlFor="name" className="block mb-2 font-medium">
                            Tournament Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block mb-2 font-medium">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 h-32"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="mt-4">
                        <label className="block mb-2 font-medium">Tournament Banner Image</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            {imagePreview ? (
                                <div className="space-y-4">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="mx-auto max-h-48 rounded"
                                    />
                                    <div className="flex justify-center space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImage(null);
                                                setImagePreview(null);
                                            }}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Remove Image
                                        </button>
                                        <label className="cursor-pointer text-blue-600 hover:text-blue-800">
                                            Replace Image
                                            <input
                                                type="file"
                                                className="sr-only"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                            />
                                        </label>
                                    </div>
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
                                            <span>Upload a file</span>
                                            <input
                                                type="file"
                                                className="sr-only"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                            />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        PNG, JPG, GIF up to 5MB
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tournament dates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="registrationCloseDate" className="block mb-2 font-medium">
                                Registration Closes
                            </label>
                            <input
                                id="registrationCloseDate"
                                type="datetime-local"
                                name="registrationCloseDate"
                                value={formData.registrationCloseDate}
                                onChange={handleChange}
                                required
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="startDate" className="block mb-2 font-medium">
                                Start Date
                            </label>
                            <input
                                id="startDate"
                                type="datetime-local"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                required
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="endDate" className="block mb-2 font-medium">
                                End Date
                            </label>
                            <input
                                id="endDate"
                                type="datetime-local"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                required
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {/* Prize and player settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="prizePool" className="block mb-2 font-medium">
                                Prize Pool ($)
                            </label>
                            <input
                                id="prizePool"
                                type="number"
                                name="prizePool"
                                value={formData.prizePool}
                                onChange={handleChange}
                                required
                                min="0"
                                step="0.01"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="maxPlayers" className="block mb-2 font-medium">
                                {isTeamTournament ? "Max Teams" : "Max Players"}
                            </label>
                            <input
                                id="maxPlayers"
                                type="number"
                                name="maxPlayers"
                                value={formData.maxPlayers}
                                onChange={handleChange}
                                required
                                min="2"
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting || (tournament && tournament.participants?.length > 0)}
                            />
                            {tournament && tournament.participants?.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Cannot change max players after registrations have started
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Game selection */}
                    <div>
                        <label htmlFor="game" className="block mb-2 font-medium">
                            Game
                        </label>
                        <GameSelector
                            value={formData.game}
                            onChange={(value) => setFormData(prev => ({ ...prev, game: value }))}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Registration Type: Individual or Team */}
                    <div className="space-y-2">
                        <label className="block mb-2 font-medium">Registration Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`flex items-center justify-center p-4 border rounded-lg cursor-pointer ${formData.registrationType === 'INDIVIDUAL' ? 'bg-blue-50 border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}>
                                <input
                                    type="radio"
                                    name="registrationType"
                                    value="INDIVIDUAL"
                                    checked={formData.registrationType === 'INDIVIDUAL'}
                                    onChange={handleChange}
                                    className="sr-only"
                                    disabled={isSubmitting || (tournament && tournament.participants?.length > 0)}
                                />
                                <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <div className="mt-2 font-medium">Individual Players</div>
                                    <div className="text-xs text-gray-500">Players register independently</div>
                                </div>
                            </label>

                            <label className={`flex items-center justify-center p-4 border rounded-lg cursor-pointer ${formData.registrationType === 'TEAM' ? 'bg-blue-50 border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}>
                                <input
                                    type="radio"
                                    name="registrationType"
                                    value="TEAM"
                                    checked={formData.registrationType === 'TEAM'}
                                    onChange={handleChange}
                                    className="sr-only"
                                    disabled={isSubmitting || (tournament && tournament.participants?.length > 0)}
                                />
                                <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <div className="mt-2 font-medium">Team-Based</div>
                                    <div className="text-xs text-gray-500">Teams register as a group</div>
                                </div>
                            </label>
                        </div>

                        {tournament && tournament.participants?.length > 0 && (
                            <p className="text-sm text-red-500">
                                Registration type cannot be changed after participants have registered
                            </p>
                        )}
                    </div>

                    {/* Team settings (only shown if team registration is selected) */}
                    {isTeamTournament && (
                        <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
                            <h3 className="text-lg font-medium border-b pb-2">Team Settings</h3>

                            <div>
                                <label htmlFor="teamSize" className="block mb-2 font-medium">
                                    Number of Players per Team
                                </label>
                                <select
                                    id="teamSize"
                                    name="teamSize"
                                    value={formData.teamSize}
                                    onChange={handleChange}
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                    disabled={isSubmitting || (tournament && tournament.participants?.length > 0)}
                                >
                                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(size => (
                                        <option key={size} value={size}>{size} players</option>
                                    ))}
                                </select>
                                <p className="text-sm text-gray-500 mt-1">
                                    Each team must have exactly this many players unless partial teams are allowed
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="allowPartialTeams"
                                            name="allowPartialTeams"
                                            type="checkbox"
                                            checked={formData.allowPartialTeams}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="allowPartialTeams" className="font-medium text-gray-700">
                                            Allow Partial Teams
                                        </label>
                                        <p className="text-gray-500">
                                            Teams can register with fewer players than required
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="teamsCanRegisterAfterStart"
                                            name="teamsCanRegisterAfterStart"
                                            type="checkbox"
                                            checked={formData.teamsCanRegisterAfterStart}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="teamsCanRegisterAfterStart" className="font-medium text-gray-700">
                                            Allow Registration After Start
                                        </label>
                                        <p className="text-gray-500">
                                            Teams can join after the tournament has started
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            id="requireTeamApproval"
                                            name="requireTeamApproval"
                                            type="checkbox"
                                            checked={formData.requireTeamApproval}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="requireTeamApproval" className="font-medium text-gray-700">
                                            Require Team Approval
                                        </label>
                                        <p className="text-gray-500">
                                            Teams must be approved by you before they can participate
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tournament format settings */}
                    <div className="space-y-6">
                        <div>
                            <label className="block mb-2 font-medium">Tournament Format</label>
                            <TournamentFormatSelector
                                value={formData.format}
                                onChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
                                disabled={isSubmitting || (tournament && tournament.participants?.length > 0)}
                            />
                            {tournament && tournament.participants?.length > 0 && (
                                <p className="text-sm text-red-500 mt-1">
                                    Tournament format cannot be changed after participants have registered
                                </p>
                            )}
                        </div>

                        {formData.format && (
                            <FormatSettings
                                format={formData.format}
                                settings={{
                                    numberOfRounds: formData.numberOfRounds,
                                    groupSize: formData.groupSize,
                                    maxPlayers: parseInt(formData.maxPlayers || 0)
                                }}
                                onChange={(newSettings) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        numberOfRounds: newSettings.numberOfRounds,
                                        groupSize: newSettings.groupSize
                                    }));
                                }}
                                disabled={isSubmitting || (tournament && tournament.bracket)}
                            />
                        )}

                        <div>
                            <label htmlFor="seedingType" className="block mb-2 font-medium">
                                Seeding Type
                            </label>
                            <select
                                id="seedingType"
                                name="seedingType"
                                value={formData.seedingType}
                                onChange={handleChange}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                disabled={isSubmitting || (tournament && tournament.bracket)}
                            >
                                <option value="RANDOM">Random</option>
                                <option value="MANUAL">Manual Seeding</option>
                                <option value="SKILL_BASED">Skill-based (Using Player Rankings)</option>
                            </select>
                            <p className="text-sm text-gray-500 mt-1">
                                {formData.seedingType === 'MANUAL' && "You'll be able to set seeds after registration closes"}
                                {formData.seedingType === 'SKILL_BASED' && "Players will be seeded based on their platform ranking"}
                            </p>
                            {tournament && tournament.bracket && (
                                <p className="text-sm text-red-500 mt-1">
                                    Seeding type cannot be changed once the tournament bracket has been created
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="rules" className="block mb-2 font-medium">
                                Tournament Rules
                            </label>
                            <textarea
                                id="rules"
                                name="rules"
                                value={formData.rules}
                                onChange={handleChange}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 h-32"
                                placeholder="Enter specific tournament rules, guidelines, and requirements..."
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Streaming settings */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Streaming Settings</h3>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="streamEmbed"
                                    name="streamEmbed"
                                    checked={formData.streamEmbed}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="streamEmbed" className="ml-2 block text-sm text-gray-900">
                                    Allow stream embedding in tournament page
                                </label>
                            </div>

                            <div>
                                <label htmlFor="streamUrl" className="block mb-2 font-medium">
                                    Official Stream URL (optional)
                                </label>
                                <input
                                    type="url"
                                    id="streamUrl"
                                    name="streamUrl"
                                    value={formData.streamUrl}
                                    onChange={handleChange}
                                    placeholder="https://twitch.tv/username"
                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Enter the Twitch URL for the official tournament stream (if any)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-end">
                        <button
                            type="button"
                            onClick={() => router.push(`/tournament/${tournamentId}`)}
                            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`py-2 px-4 rounded font-medium text-white ${isSubmitting
                                ? "bg-blue-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                                } transition-colors`}
                        >
                            {isSubmitting ? "Updating..." : "Update Tournament"}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}