"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout.jsx";
import GameSelector from "../../../components/GameSelector.jsx";
import TournamentFormatSelector from "../../../components/TournamentFormatSelector";
import FormatSettings from "../../../components/FormatSettings";

export default function CreateTournament() {
  const router = useRouter();
  const { data: status } = useSession();
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
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      sessionStorage.setItem("redirectUrl", "/tournament/create");
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

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

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, formData[key]);
      });
      if (image) {
        formDataToSend.append("image", image);
      }

      const response = await fetch("/api/tournaments", {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create tournament");
      }

      router.push(`/tournament/${data.id}`);
    } catch (err) {
      console.error("Error creating tournament:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Create Tournament</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                Max Players
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
                disabled={isSubmitting}
              />
            </div>
          </div>

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

          <div className="space-y-6">
            <div>
              <label className="block mb-2 font-medium">Tournament Format</label>
              <TournamentFormatSelector
                value={formData.format}
                onChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
                disabled={isSubmitting}
              />
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              >
                <option value="RANDOM">Random</option>
                <option value="MANUAL">Manual Seeding</option>
                <option value="SKILL_BASED">Skill-based (Using Player Rankings)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {formData.seedingType === 'MANUAL' && "You'll be able to set seeds after registration closes"}
                {formData.seedingType === 'SKILL_BASED' && "Players will be seeded based on their platform ranking"}
              </p>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded font-medium text-white ${isSubmitting
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
              } transition-colors`}
          >
            {isSubmitting ? "Creating Tournament..." : "Create Tournament"}
          </button>
        </form>
      </div>
    </Layout>
  );
}