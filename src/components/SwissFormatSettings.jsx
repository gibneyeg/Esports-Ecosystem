"use client";

import React from 'react';

const SwissFormatSettings = ({ formatSettings, onChange }) => {
    const numberOfRounds = formatSettings?.numberOfRounds || 3;
    const pointsForWin = formatSettings?.pointsForWin || 3;
    const pointsForDraw = formatSettings?.pointsForDraw || 1;
    const pointsForLoss = formatSettings?.pointsForLoss || 0;

    const handleChange = (e) => {
        const { name, value } = e.target;

        const updatedSettings = {
            ...formatSettings,
            [name]: parseInt(value, 10)
        };

        onChange(updatedSettings);
    };

    return (
        <div className="space-y-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold text-lg">Swiss Tournament Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="numberOfRounds" className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Rounds
                    </label>
                    <select
                        id="numberOfRounds"
                        name="numberOfRounds"
                        value={numberOfRounds}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        {[3, 4, 5, 6, 7, 8, 9].map(num => (
                            <option key={num} value={num}>
                                {num} {num === 1 ? 'Round' : 'Rounds'}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Recommended rounds: 3-5 for small tournaments, 6-9 for larger ones
                    </p>
                </div>

                <div>
                    <label htmlFor="pointsForWin" className="block text-sm font-medium text-gray-700 mb-1">
                        Points for Win
                    </label>
                    <select
                        id="pointsForWin"
                        name="pointsForWin"
                        value={pointsForWin}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        {[1, 2, 3, 4, 5].map(num => (
                            <option key={num} value={num}>
                                {num} {num === 1 ? 'Point' : 'Points'}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="pointsForDraw" className="block text-sm font-medium text-gray-700 mb-1">
                        Points for Draw
                    </label>
                    <select
                        id="pointsForDraw"
                        name="pointsForDraw"
                        value={pointsForDraw}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        {[0, 0.5, 1, 2].map(num => (
                            <option key={num} value={num}>
                                {num} {num === 1 ? 'Point' : 'Points'}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="pointsForLoss" className="block text-sm font-medium text-gray-700 mb-1">
                        Points for Loss
                    </label>
                    <select
                        id="pointsForLoss"
                        name="pointsForLoss"
                        value={pointsForLoss}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        {[0, 1].map(num => (
                            <option key={num} value={num}>
                                {num} {num === 1 ? 'Point' : 'Points'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
                <h4 className="font-medium mb-1">About Swiss Tournaments</h4>
                <p>
                    In a Swiss-system tournament, players are paired with opponents who have similar scores.
                    No player is eliminated, and everyone plays in each round. Winners play winners, and losers play losers.
                    The final standings are determined by total points earned.
                </p>
            </div>
        </div>
    );
};

export default SwissFormatSettings;