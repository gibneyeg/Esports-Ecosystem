"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout.jsx";
import GameSelector from "../../../components/GameSelector.jsx";

export default function CreateTournament() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    registrationCloseDate: "",
    prizePool: "",
    maxPlayers: "",
    game: "",
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
    const registrationCloseTime = new Date(
      formData.registrationCloseDate
    ).getTime();

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
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
            <label htmlFor="name" className="block mb-2">
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
            <label htmlFor="description" className="block mb-2">
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
            <label className="block mb-2">Tournament Banner Image</label>
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
              <label htmlFor="registrationCloseDate" className="block mb-2">
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
              <label htmlFor="startDate" className="block mb-2">
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
              <label htmlFor="endDate" className="block mb-2">
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
              <label htmlFor="prizePool" className="block mb-2">
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
              <label htmlFor="maxPlayers" className="block mb-2">
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
  <label htmlFor="game" className="block mb-2">
    Game
  </label>
  <GameSelector
    value={formData.game}
    onChange={(value) => setFormData(prev => ({ ...prev, game: value }))}
    disabled={isSubmitting}
  />
</div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded font-medium text-white ${
              isSubmitting
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
