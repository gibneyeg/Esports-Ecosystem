import React from "react";

const TournamentBracket = ({ maxPlayers }) => {
  const Match = ({ roundName, matchNumber, isLastInRound, isEvenMatch }) => (
    <div className="relative">
      <div className="bg-white border border-gray-200 rounded-lg p-4 w-64 shadow-sm">
        <div className="text-xs text-gray-600 mb-2">
          {roundName} - Match {matchNumber}
        </div>
        <div className="space-y-3">
          <div className="bg-gray-50 p-2 rounded">
            <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
      {!isLastInRound && (
        <>
          <div className="absolute top-1/2 -right-12 w-12 h-[2px] bg-gray-300"></div>
          {isEvenMatch && (
            <div
              className="absolute -right-12 h-[100px] w-[2px] bg-gray-300"
              style={{
                top: "-25px",
              }}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Tournament Bracket</h3>
        <p className="text-sm text-gray-600">
          {maxPlayers} participants • 2 rounds
        </p>
      </div>

      <div className="flex gap-12 pb-8">
        <div className="flex flex-col">
          <div className="text-center font-medium text-gray-700 mb-4">
            Semi-Finals
          </div>
          <div className="space-y-8">
            <Match
              roundName="Semi-Finals"
              matchNumber={1}
              isEvenMatch={false}
            />
            <Match roundName="Semi-Finals" matchNumber={2} isEvenMatch={true} />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="text-center font-medium text-gray-700 mb-4">
            Final
          </div>
          <Match roundName="Final" matchNumber={1} isLastInRound={true} />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-100 rounded"></div>
            <span>Empty Slot</span>
          </div>
          <div>Semi-Finals: 2 matches • Final: 1 match</div>
        </div>
      </div>
    </div>
  );
};

export default TournamentBracket;
