"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "/src/components/Layout.jsx";
import SearchBar from "../../../../components/GameSearch";

export default function TournamentCategory({ params }) {
    const { name } = params;
    const [tournaments, setTournaments] = useState([]);
    const [filteredTournaments, setFilteredTournaments] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Transform category to display name
    const getCategoryDisplayName = () => {
        switch (name) {
            case 'closing-soon':
                return 'Registration Closing Soon';
            case 'active':
                return 'Active Tournaments';
            case 'upcoming':
                return 'Upcoming Tournaments';
            case 'completed':
                return 'Completed Tournaments';
            default:
                return 'All Tournaments';
        }
    };

    // Get category color 
    const getCategoryColor = () => {
        switch (name) {
            case 'closing-soon':
                return 'text-orange-500';
            case 'active':
                return 'text-green-500';
            case 'upcoming':
                return 'text-blue-500';
            case 'completed':
                return 'text-red-600';
            default:
                return 'text-gray-800';
        }
    };

    useEffect(() => {
        const fetchTournaments = async () => {
            try {
                const response = await fetch("/api/tournaments");
                if (response.ok) {
                    const data = await response.json();
                    setTournaments(data);

                    // Filter tournaments based on category
                    const now = new Date();
                    let categoryTournaments = [];

                    switch (name) {
                        case 'closing-soon':
                            categoryTournaments = data.filter(tournament => {
                                const registrationCloseDate = new Date(tournament.registrationCloseDate);
                                const daysUntilClose = (registrationCloseDate - now) / (1000 * 60 * 60 * 24);
                                return daysUntilClose <= 7 && daysUntilClose > 0 && tournament.status === "UPCOMING";
                            });
                            break;
                        case 'active':
                            categoryTournaments = data.filter(tournament => {
                                const startDate = new Date(tournament.startDate);
                                const endDate = new Date(tournament.endDate);
                                return (startDate <= now && endDate >= now) || tournament.status === "IN_PROGRESS";
                            });
                            break;
                        case 'upcoming':
                            categoryTournaments = data.filter(tournament => {
                                const startDate = new Date(tournament.startDate);
                                return startDate > now && tournament.status === "UPCOMING";
                            });
                            break;
                        case 'completed':
                            categoryTournaments = data.filter(tournament => {
                                const endDate = new Date(tournament.endDate);
                                return endDate < now || tournament.status === "COMPLETED";
                            });
                            break;
                        default:
                            categoryTournaments = data;
                    }

                    setFilteredTournaments(categoryTournaments);
                }
            } catch (error) {
                console.error("Error fetching tournaments:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTournaments();
    }, [name]);

    const filterTournaments = (query) => {
        if (!query.trim()) {
            // Reset to category-filtered tournaments
            const now = new Date();
            let categoryTournaments = [];

            switch (name) {
                case 'closing-soon':
                    categoryTournaments = tournaments.filter(tournament => {
                        const registrationCloseDate = new Date(tournament.registrationCloseDate);
                        const daysUntilClose = (registrationCloseDate - now) / (1000 * 60 * 60 * 24);
                        return daysUntilClose <= 7 && daysUntilClose > 0 && tournament.status === "UPCOMING";
                    });
                    break;
                case 'active':
                    categoryTournaments = tournaments.filter(tournament => {
                        const startDate = new Date(tournament.startDate);
                        const endDate = new Date(tournament.endDate);
                        return (startDate <= now && endDate >= now) || tournament.status === "IN_PROGRESS";
                    });
                    break;
                case 'upcoming':
                    categoryTournaments = tournaments.filter(tournament => {
                        const startDate = new Date(tournament.startDate);
                        return startDate > now && tournament.status === "UPCOMING";
                    });
                    break;
                case 'completed':
                    categoryTournaments = tournaments.filter(tournament => {
                        const endDate = new Date(tournament.endDate);
                        return endDate < now || tournament.status === "COMPLETED";
                    });
                    break;
                default:
                    categoryTournaments = tournaments;
            }

            setFilteredTournaments(categoryTournaments);
            return;
        }

        const searchTerms = query.toLowerCase().split(' ');

        // First filter by category
        const now = new Date();
        let categoryTournaments = [];

        switch (name) {
            case 'closing-soon':
                categoryTournaments = tournaments.filter(tournament => {
                    const registrationCloseDate = new Date(tournament.registrationCloseDate);
                    const daysUntilClose = (registrationCloseDate - now) / (1000 * 60 * 60 * 24);
                    return daysUntilClose <= 7 && daysUntilClose > 0 && tournament.status === "UPCOMING";
                });
                break;
            case 'active':
                categoryTournaments = tournaments.filter(tournament => {
                    const startDate = new Date(tournament.startDate);
                    const endDate = new Date(tournament.endDate);
                    return (startDate <= now && endDate >= now) || tournament.status === "IN_PROGRESS";
                });
                break;
            case 'upcoming':
                categoryTournaments = tournaments.filter(tournament => {
                    const startDate = new Date(tournament.startDate);
                    return startDate > now && tournament.status === "UPCOMING";
                });
                break;
            case 'completed':
                categoryTournaments = tournaments.filter(tournament => {
                    const endDate = new Date(tournament.endDate);
                    return endDate < now || tournament.status === "COMPLETED";
                });
                break;
            default:
                categoryTournaments = tournaments;
        }

        //  filter by search 
        const filtered = categoryTournaments.filter(tournament =>
            searchTerms.every(term =>
                tournament.name.toLowerCase().includes(term) ||
                tournament.game.toLowerCase().includes(term)
            )
        );

        setFilteredTournaments(filtered);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-IE", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };

    const now = new Date();

    const renderTournamentCard = (tournament) => {
        const isCompleted = tournament.status === "COMPLETED";
        const registrationCloseDate = new Date(tournament.registrationCloseDate);
        const daysUntilClose = Math.ceil((registrationCloseDate - now) / (1000 * 60 * 60 * 24));
        const showReminder = daysUntilClose <= 7 && daysUntilClose > 0 && tournament.status === "UPCOMING";

        return (
            <div
                key={tournament.id}
                className="bg-white p-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 w-full relative group"
            >
                {showReminder && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium z-30">
                        {daysUntilClose}d left to register
                    </div>
                )}

                <div className="relative w-full h-40 mb-4">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                        {tournament.imageUrl ? (
                            <img
                                src={tournament.imageUrl}
                                alt={tournament.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                <span className="text-4xl font-bold text-gray-300">
                                    {tournament.game[0]}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
                        {tournament.name}
                    </h3>

                    <div className="flex items-center space-x-2 text-gray-600">
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
                            {tournament.game}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Prize Pool</span>
                            <span className="font-semibold text-green-600">
                                ${tournament.prizePool}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Players</span>
                            <span className="font-semibold">
                                {tournament.participants?.length || 0}/{tournament.maxPlayers}
                            </span>
                        </div>
                        {!isCompleted ? (
                            <div className="pt-1">
                                <div className="text-xs text-gray-600">Registration Closes</div>
                                <div className="font-medium text-sm text-gray-800">
                                    {formatDate(tournament.registrationCloseDate)}
                                </div>
                                <div className="text-xs text-red-600 mt-2">Tournament Starts</div>
                                <div className="font-medium text-sm text-red-700">
                                    {formatDate(tournament.startDate)}
                                </div>
                            </div>
                        ) : (
                            <div className="pt-1">
                                <div className="text-xs text-gray-600">Tournament Ended</div>
                                <div className="font-medium text-sm text-gray-800">
                                    {formatDate(tournament.endDate)}
                                </div>
                            </div>
                        )}

                        {isCompleted && tournament.winner && (
                            <div className="pt-1">
                                <div className="text-xs text-gray-600">Winner</div>
                                <div className="font-medium text-sm text-gray-800">
                                    {tournament.winner.name}
                                </div>
                            </div>
                        )}
                    </div>

                    <Link
                        href={`/tournament/${tournament.id}`}
                        className={`mt-3 w-full py-2 px-4 text-white text-sm text-center font-medium rounded-lg transition-colors ${isCompleted
                            ? "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700"
                            : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                            } block relative z-10`}
                    >
                        {isCompleted ? "View Results" : "View Details"}
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <div className="relative bg-[#0f111a] text-white py-20">
                <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
                    <h1 className={`text-4xl md:text-5xl font-bold ${getCategoryColor()}`}>
                        {getCategoryDisplayName()}
                    </h1>
                    <p className="text-lg text-gray-300">
                        Showing all {filteredTournaments.length} tournaments in this category
                    </p>
                    <Link
                        href="/tournament"
                        className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200"
                    >
                        ← Back to All Tournaments
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 py-16">
                <div className="max-w-[1240px] mx-auto">
                    <div className="mb-12">
                        <SearchBar
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            filterTournaments={filterTournaments}
                        />
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
                                <div
                                    key={index}
                                    className="bg-white p-6 rounded-xl shadow-lg w-full animate-pulse"
                                >
                                    <div className="w-full h-40 bg-gray-200 rounded-lg mb-4" />
                                    <div className="space-y-3">
                                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                                        <div className="space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-full" />
                                            <div className="h-4 bg-gray-200 rounded w-full" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTournaments.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTournaments.map((tournament) => renderTournamentCard(tournament))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <p className="text-xl text-gray-600 mb-4">No tournaments found in this category.</p>
                            <Link
                                href="/tournament"
                                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                            >
                                Return to All Tournaments
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}