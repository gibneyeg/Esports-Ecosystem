import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const TournamentManagement = ({
  tournamentId,
  hasAccess,
  canEdit,
  isOwner
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");

  const handleCancelTournament = async () => {
    try {
      setIsDeleting(true);
      setError("");
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to cancel tournament");
      }
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

  if (!session) return null;
  if (!hasAccess) return null;

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}
      {!showConfirmation ? (
        <>
          {canEdit && (
            <button
              onClick={() => router.push(`/tournament/${tournamentId}/edit`)}
              className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Edit Tournament
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setShowConfirmation(true)}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              disabled={isDeleting}
            >
              Cancel Tournament
            </button>
          )}
        </>
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
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              disabled={isDeleting}
            >
              No, keep tournament
            </button>
            <button
              onClick={handleCancelTournament}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              disabled={isDeleting}
            >
              {isDeleting ? "Cancelling..." : "Yes, cancel tournament"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TournamentManagement;