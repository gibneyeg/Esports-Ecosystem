-- CreateTable
CREATE TABLE "TournamentTeamWinner" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prizeMoney" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentTeamWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeamWinner_tournamentId_position_key" ON "TournamentTeamWinner"("tournamentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeamWinner_tournamentId_teamId_key" ON "TournamentTeamWinner"("tournamentId", "teamId");

-- AddForeignKey
ALTER TABLE "TournamentTeamWinner" ADD CONSTRAINT "TournamentTeamWinner_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeamWinner" ADD CONSTRAINT "TournamentTeamWinner_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
