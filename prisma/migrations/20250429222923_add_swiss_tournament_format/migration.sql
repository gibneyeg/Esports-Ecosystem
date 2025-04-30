-- CreateTable
CREATE TABLE "TournamentSwissRound" (
    "id" TEXT NOT NULL,
    "bracketId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentSwissRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentSwissMatch" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "player1Id" TEXT,
    "player2Id" TEXT,
    "result" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentSwissMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentSwissBracket" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentSwissBracket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentSwissRound_bracketId_idx" ON "TournamentSwissRound"("bracketId");

-- CreateIndex
CREATE INDEX "TournamentSwissMatch_roundId_idx" ON "TournamentSwissMatch"("roundId");

-- CreateIndex
CREATE INDEX "TournamentSwissMatch_player1Id_idx" ON "TournamentSwissMatch"("player1Id");

-- CreateIndex
CREATE INDEX "TournamentSwissMatch_player2Id_idx" ON "TournamentSwissMatch"("player2Id");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentSwissBracket_tournamentId_key" ON "TournamentSwissBracket"("tournamentId");

-- AddForeignKey
ALTER TABLE "TournamentSwissRound" ADD CONSTRAINT "TournamentSwissRound_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "TournamentSwissBracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSwissMatch" ADD CONSTRAINT "TournamentSwissMatch_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "TournamentSwissRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSwissMatch" ADD CONSTRAINT "TournamentSwissMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSwissMatch" ADD CONSTRAINT "TournamentSwissMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSwissBracket" ADD CONSTRAINT "TournamentSwissBracket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
