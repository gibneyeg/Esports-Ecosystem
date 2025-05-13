"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../../../components/Layout.jsx";
import TournamentManagement from "../../../components/TournamentManagment.jsx";
import TournamentWinner from "../../../components/TournamentWinner.jsx";
import TwitchStream from "../../../components/TournamentStream.jsx";
import TournamentBracketsHandler from "@/components/TournamentBracketHandler.jsx";
import TeamTournamentRegistration from "@/components/TeamTournamentRegistration.jsx";
import TournamentRoles from "@/components/TournamentRoles.jsx";
import Image from "next/image";
import Link from "next/link";

export default function TournamentView({ tournamentId }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize activeTab from URL 
  const [activeTab, setActiveTab] = useState('info');

  // Combined state for user access
  const [userAccess, setUserAccess] = useState({
    canManage: false,
    canEdit: false,
    role: null,
  });

  // Load active tab from URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['info', 'bracket', 'streams'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Update URL hash when active tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const updateTournamentStatus = async (tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.startDate);
    const endDate = new Date(tournament.endDate);

    let newStatus;

    if (endDate < now) {
      newStatus = "COMPLETED";
    } else if (now >= startDate && now <= endDate) {
      newStatus = "IN_PROGRESS";
    } else {
      newStatus = "UPCOMING";
    }

    // Only update if status has changed
    if (newStatus !== tournament.status) {
      try {
        const response = await fetch(`/api/tournaments/${tournament.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          throw new Error('Failed to update tournament status');
        }

        return await response.json();
      } catch (error) {
        console.error('Error updating tournament status:', error);
        return tournament;
      }
    }

    return tournament;
  };

  useEffect(() => {
    let mounted = true;

    async function fetchAllData() {
      if (!tournamentId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch tournament data and access data in parallel
        const [tournamentResponse, accessResponse] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}/details`, {
            credentials: "include",
          }),
          session?.user?.id
            ? fetch(`/api/tournaments/${tournamentId}/check-access`)
            : Promise.resolve(null),
        ]);

        // Process tournament data
        const tournamentData = await tournamentResponse.json();

        if (!tournamentResponse.ok) {
          throw new Error(tournamentData.message || "Failed to fetch tournament");
        }

        // Process access data if available
        let accessData = {};
        if (accessResponse && accessResponse.ok) {
          accessData = await accessResponse.json();
        }

        if (mounted) {
          // Make sure teamParticipants is initialized if not present
          if (!tournamentData.teamParticipants) {
            tournamentData.teamParticipants = [];
          }

          // Update tournament status if needed
          const updatedTournament = await updateTournamentStatus(tournamentData);
          setTournament(updatedTournament);
          setUserAccess(accessData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchAllData();

    return () => {
      mounted = false;
    };
  }, [tournamentId, session?.user?.id]);

  const handleJoinTournament = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `/api/tournaments/${tournamentId}/participate`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join tournament");
      }

      setTournament(data);
    } catch (err) {
      console.error("Error joining tournament:", err);
      setError(err.message);
    }
  };

  const getDisplayName = (user) => {
    if (!user) return "Unknown User";
    if (user.name) return user.name;
    if (user.username) return user.username;
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "Anonymous User";
  };

  const getParticipantDisplayName = (participant) => {
    return participant && participant.user ? getDisplayName(participant.user) : "Unknown Participant";
  };

  const getTournamentStatus = () => {
    return tournament ? tournament.status : "UNKNOWN";
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "COMPLETED":
        return "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800";
      case "IN_PROGRESS":
        return "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800";
      case "UPCOMING":
        return "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800";
      default:
        return "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800";
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case "SINGLE_ELIMINATION":
        return "🏆";
      case "DOUBLE_ELIMINATION":
        return "🔄";
      case "ROUND_ROBIN":
        return "🔁";
      case "SWISS":
        return "🎯";
      default:
        return "🎮";
    }
  };

  // Validate image URL to prevent XSS
  const validateImageUrl = (url) => {
    if (!url) return false;

    return (
      (url.startsWith('http://') ||
        url.startsWith('https://')) &&
      !url.includes('javascript:')
    );
  };

  // Check if tournament is team-based - with safe access
  const isTeamTournament = () => {
    return tournament?.formatSettings?.registrationType === "TEAM";
  };

  // Check if the user is part of a team in this tournament - with safe access
  const isUserInParticipatingTeam = () => {
    if (!session?.user?.id || !tournament?.teamParticipants || !isTeamTournament()) {
      return false;
    }

    return tournament.teamParticipants.some(teamParticipant =>
      teamParticipant.team.members.some(member => member.user.id === session.user.id)
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Tournament not found
          </div>
        </div>
      </Layout>
    );
  }

  // Check user access
  const hasAccess = userAccess.role === 'OWNER' || userAccess.role === 'ADMIN';
  const isOwner = userAccess.role === 'OWNER';
  const isAdmin = userAccess.role === 'ADMIN';

  const isIndividualParticipant = tournament.participants?.some(
    (p) => p.user.id === session?.user?.id
  );

  const canJoinIndividual =
    !isTeamTournament() &&
    !isIndividualParticipant &&
    (tournament.participants?.length || 0) < tournament.maxPlayers &&
    tournament.status === "UPCOMING" &&
    new Date() < new Date(tournament.registrationCloseDate);

  const isTeamRegistrationOpen =
    isTeamTournament() &&
    (tournament.teamParticipants?.length || 0) < tournament.maxPlayers &&
    tournament.status === "UPCOMING" &&
    new Date() < new Date(tournament.registrationCloseDate);

  const formatDate = (date) => {
    if (!date) return "Date not specified";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      console.error("Date formatting error:", err);
      return "Invalid date";
    }
  };

  const currentStatus = getTournamentStatus();
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 mt-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {tournament.name}
              </h1>
              <p className="text-gray-600 mt-2">
                Created by:{" "}
                {tournament.createdBy ? (
                  <Link href={`/user/${tournament.createdBy.id}`} className="hover:text-blue-600 hover:underline">
                    {getDisplayName(tournament.createdBy)}
                  </Link>
                ) : (
                  "Unknown"
                )}
              </p>
              {(isAdmin || isOwner) && (
                <p className="text-sm text-blue-600 mt-1">
                  Your role: {isOwner ? 'Tournament Owner' : 'Tournament Admin'}
                </p>
              )}
            </div>
            {session?.user && canJoinIndividual && (
              <button
                onClick={handleJoinTournament}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Join Tournament
              </button>
            )}
          </div>

          {tournament.imageUrl && validateImageUrl(tournament.imageUrl) && (
            <div className="mt-4 mb-6">
              <Image
                src={tournament.imageUrl}
                alt={tournament.name}
                width={800}
                height={400}
                className="w-full h-64 object-cover rounded-lg shadow-md"
              />
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mt-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => handleTabChange('info')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Tournament Info
              </button>
              <button
                onClick={() => handleTabChange('bracket')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'bracket'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Bracket
              </button>
              <button
                onClick={() => handleTabChange('streams')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'streams'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Streams
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Tournament Details</h2>
                  <div className="space-y-3">
                    <p>
                      <span className="font-medium">Game:</span> {tournament.game}
                    </p>
                    <p>
                      <span className="font-medium">Registration Type:</span>{" "}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {isTeamTournament() ? "Team-Based" : "Individual Players"}
                      </span>
                    </p>
                    {isTeamTournament() && tournament.formatSettings && (
                      <p>
                        <span className="font-medium">Team Size:</span>{" "}
                        {tournament.formatSettings.teamSize} players
                        {tournament.formatSettings.allowPartialTeams && " (partial teams allowed)"}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Format:</span>{" "}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {getFormatIcon(tournament.format)}{" "}
                        {tournament.format?.split('_').map(word =>
                          word.charAt(0) + word.slice(1).toLowerCase()
                        ).join(' ')}
                      </span>
                    </p>
                    {tournament.format === 'SWISS' && tournament.formatSettings?.numberOfRounds && (
                      <p>
                        <span className="font-medium">Number of Rounds:</span>{" "}
                        {tournament.formatSettings.numberOfRounds}
                      </p>
                    )}
                    {tournament.format === 'ROUND_ROBIN' && tournament.formatSettings?.groupSize && (
                      <p>
                        <span className="font-medium">Players per Group:</span>{" "}
                        {tournament.formatSettings.groupSize}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Seeding:</span>{" "}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {tournament.seedingType?.split('_').map(word =>
                          word.charAt(0) + word.slice(1).toLowerCase()
                        ).join(' ')}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Registration Closes:</span>{" "}
                      {formatDate(tournament.registrationCloseDate)}
                    </p>
                    <p>
                      <span className="font-medium">Start Date:</span>{" "}
                      {formatDate(tournament.startDate)}
                    </p>
                    <p>
                      <span className="font-medium">End Date:</span>{" "}
                      {formatDate(tournament.endDate)}
                    </p>
                    <p>
                      <span className="font-medium">Prize Pool:</span> ${tournament.prizePool}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      <span className={getStatusStyle(currentStatus)}>
                        {currentStatus}
                      </span>
                    </p>
                    <p className="text-lg">
                      {isTeamTournament(tournament) ? "Teams" : "Players"}
                    </p>
                    <p className="text-2xl font-bold">
                      {isTeamTournament(tournament)
                        ? `${tournament.teamParticipants?.length || 0}/${tournament.maxPlayers}`
                        : `${tournament.participants?.length || 0}/${tournament.maxPlayers}`
                      }
                    </p>
                    {tournament.winner && (
                      <p>
                        <span className="font-medium">Winner:</span>{" "}
                        <Link
                          href={`/user/${tournament.winner.id}`}
                          className="text-green-600 font-semibold hover:text-green-700 hover:underline"
                        >
                          {getDisplayName(tournament.winner)}
                        </Link>
                      </p>
                    )}
                    {tournament.rules && (
                      <div className="mt-4">
                        <p className="font-medium mb-2">Tournament Rules:</p>
                        <div className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap">
                          {tournament.rules}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team Tournament Registration */}
                  {isTeamTournament() && isTeamRegistrationOpen && !isUserInParticipatingTeam() && (
                    <div className="mt-6">
                      <TeamTournamentRegistration
                        tournamentId={tournament.id}
                        formatSettings={tournament.formatSettings}
                        isRegistrationOpen={isTeamRegistrationOpen}
                      />
                    </div>
                  )}
                </div>

                <div>
                  {isTeamTournament() ? (
                    // Team participants list
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Teams</h2>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {tournament.teamParticipants?.length > 0 ? (
                          tournament.teamParticipants.map((teamParticipant) => {
                            const team = teamParticipant.team;
                            return (
                              <div
                                key={teamParticipant.id}
                                className="bg-gray-50 p-4 rounded-md"
                              >
                                <div className="flex items-center mb-3">
                                  {team.logoUrl ? (
                                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                                      <Image
                                        src={team.logoUrl}
                                        alt={team.name}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                      <span className="text-blue-800 font-medium">
                                        {team.tag?.slice(0, 2).toUpperCase() || "T"}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <h3 className="font-medium">
                                      {teamParticipant.seedNumber && (
                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs mr-2">
                                          {teamParticipant.seedNumber}
                                        </span>
                                      )}
                                      <Link href={`/teams/${team.id}`} className="hover:text-blue-600 hover:underline">
                                        [{team.tag}] {team.name}
                                      </Link>
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                      {team.members?.length || 0} members • Joined {new Date(teamParticipant.joinedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="pl-4 border-l-2 border-gray-200 ml-2">
                                  <p className="text-sm text-gray-600 mb-1">Team Members:</p>
                                  <div className="space-y-1">
                                    {team.members?.map((member) => (
                                      <div key={member.id} className="flex items-center">
                                        {member.user.image ? (
                                          <Image
                                            src={member.user.image}
                                            alt={getDisplayName(member.user)}
                                            width={20}
                                            height={20}
                                            className="w-5 h-5 rounded-full mr-2"
                                          />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                            <span className="text-gray-600 text-xs">
                                              {getDisplayName(member.user).charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                        )}
                                        <Link
                                          href={`/user/${member.user.id}`}
                                          className="text-sm hover:text-blue-600 hover:underline"
                                        >
                                          {getDisplayName(member.user)}
                                        </Link>
                                        {member.role === "OWNER" && (
                                          <span className="ml-1 text-xs text-gray-500">(Captain)</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-500">No teams have registered yet</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Individual participants list
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Participants</h2>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {tournament.participants?.length > 0 ? (
                          tournament.participants.map((participant) => {
                            const displayName = getParticipantDisplayName(participant);
                            const firstLetter = displayName.charAt(0).toUpperCase();

                            return (
                              <div
                                key={participant.id}
                                className="bg-gray-50 p-2 rounded-md flex items-center justify-between"
                              >
                                <div className="flex items-center">
                                  {/* Profile Picture/Avatar */}
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 mr-3">
                                    {participant.user?.image && validateImageUrl(participant.user.image) ? (
                                      <Image
                                        src={participant.user.image}
                                        alt={displayName}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-800 font-medium">
                                        {firstLetter}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center">
                                    {participant.seedNumber && (
                                      <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs mr-2">
                                        {participant.seedNumber}
                                      </span>
                                    )}
                                    <Link
                                      href={`/user/${participant.user.id}`}
                                      className="hover:text-blue-600 hover:underline"
                                    >
                                      {displayName}
                                    </Link>
                                  </div>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {formatDate(participant.joinedAt)}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-gray-500">No participants yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {hasAccess && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Tournament Management</h2>
                  <div className="flex gap-3">
                    <TournamentWinner
                      tournament={tournament}
                      onWinnerDeclared={(updatedTournament) => {
                        setTournament(updatedTournament);
                      }}
                      hasAccess={userAccess.canManage}
                      canEdit={userAccess.canEdit}
                      isOwner={isOwner}
                    />
                    <TournamentManagement
                      tournamentId={tournament.id}
                      hasAccess={userAccess.canManage}
                      canEdit={userAccess.canEdit}
                      isOwner={isOwner}
                    />
                  </div>
                  {/* Only owners can manage roles */}
                  {isOwner && (
                    <TournamentRoles
                      tournamentId={tournament.id}
                      isOwner={isOwner}
                    />
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'bracket' && (
            <div className="mt-8">
              <TournamentBracketsHandler
                tournament={tournament}
                currentUser={session?.user}
              />
            </div>
          )}

          {activeTab === 'streams' && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Tournament Streams</h2>
              <TwitchStream
                tournament={tournament}
                isCreator={isOwner}
                onStreamUpdate={(streams) => {
                  setTournament({
                    ...tournament,
                    featuredStreams: streams
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}