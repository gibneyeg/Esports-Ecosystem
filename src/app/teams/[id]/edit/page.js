"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function EditTeam({ params }) {
    const router = useRouter();
    const teamId = params.id;
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        name: "",
        tag: "",
        description: "",
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [existingLogo, setExistingLogo] = useState(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Fetch team data
    useEffect(() => {
        async function fetchTeam() {
            if (!teamId || !session?.user?.id) return;

            try {
                setIsLoading(true);
                setError("");

                const response = await fetch(`/api/teams/${teamId}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch team data");
                }

                const team = await response.json();

                // Check if user is the team owner
                if (team.ownerId !== session.user.id) {
                    router.push(`/teams/${teamId}`);
                    return;
                }

                setFormData({
                    name: team.name || "",
                    tag: team.tag || "",
                    description: team.description || ""
                });

                if (team.logoUrl) {
                    setExistingLogo(team.logoUrl);
                    setLogoPreview(team.logoUrl);
                }

            } catch (err) {
                console.error("Error fetching team:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        if (session) {
            fetchTeam();
        } else {
            router.push("/login");
        }
    }, [teamId, session, router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
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
            setRemoveLogo(false);

            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogo(null);
        setLogoPreview(null);
        setRemoveLogo(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError("");
        setSuccess("");

        try {
            // Validate form
            if (!formData.name.trim() || !formData.tag.trim()) {
                throw new Error("Team name and tag are required");
            }

            if (formData.tag.length < 2 || formData.tag.length > 5) {
                throw new Error("Team tag must be between 2-5 characters");
            }

            const teamFormData = new FormData();
            teamFormData.append("name", formData.name);
            teamFormData.append("tag", formData.tag);
            teamFormData.append("description", formData.description);

            // Handle logo changes
            if (logo) {
                teamFormData.append("logo", logo);
            }

            // If we're removing the logo, include that info
            if (removeLogo) {
                teamFormData.append("removeLogo", "true");
            }

            const response = await fetch(`/api/teams/${teamId}`, {
                method: "PUT",
                body: teamFormData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update team");
            }

            setSuccess("Team updated successfully!");

            // Show success message briefly, then redirect
            setTimeout(() => {
                router.push(`/teams/${teamId}`);
            }, 1000);

        } catch (err) {
            console.error("Error updating team:", err);
            setError(err.message);
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="max-w-3xl mx-auto p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-3xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Edit Team</h1>

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
                                disabled={isSaving}
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
                                disabled={isSaving}
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
                            disabled={isSaving}
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-medium">Team Logo</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            {logoPreview ? (
                                <div className="space-y-4">
                                    <img
                                        src={logoPreview}
                                        alt="Logo Preview"
                                        className="mx-auto max-h-48 rounded-full"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="text-red-600 hover:text-red-800"
                                        disabled={isSaving}
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
                                                disabled={isSaving}
                                            />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => router.push(`/teams/${teamId}`)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}