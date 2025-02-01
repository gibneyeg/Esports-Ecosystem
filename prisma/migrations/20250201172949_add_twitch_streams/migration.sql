-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "streamEmbed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "streamUrl" TEXT;

-- CreateTable
CREATE TABLE "TournamentStream" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "streamUrl" TEXT NOT NULL,
    "streamerName" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentStream_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentStream_tournamentId_idx" ON "TournamentStream"("tournamentId");

-- AddForeignKey
ALTER TABLE "TournamentStream" ADD CONSTRAINT "TournamentStream_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
