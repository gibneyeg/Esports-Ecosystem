import React, { useState } from "react";
import { useRouter } from "next/navigation";

const TournamentManagement = ({ tournamentId }) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");

  const handleCancelTournament = async () => {
    try {
      setIsDeleting(true);
      setError("");

      const response = await fetch(`/api/tournaments/${tournamentId}/details`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel tournament");
      }

      // Use the tournaments page route
      router.push("/tournament");
      router.refresh();
    } catch (error) {
      console.error("Error cancelling tournament:", error);
      setError(error.message);
    } finally {
      setIsDeleting(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t">
      <h2 className="text-xl font-semibold mb-4">Tournament Management</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {!showConfirmation ? (
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/tournaments/${tournamentId}/edit`)}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Edit Tournament
          </button>
          <button
            onClick={() => setShowConfirmation(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            disabled={isDeleting}
          >
            {isDeleting ? "Cancelling..." : "Cancel Tournament"}
          </button>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 mb-4">
            Are you sure you want to cancel this tournament? This action cannot
            be undone and will remove all participants and tournament data.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowConfirmation(false);
                setError("");
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              disabled={isDeleting}
            >
              No, keep tournament
            </button>
            <button
              onClick={handleCancelTournament}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              disabled={isDeleting}
            >
              {isDeleting ? "Cancelling..." : "Yes, cancel tournament"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManagement;
