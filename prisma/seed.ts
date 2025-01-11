// prisma/seed.ts
import { PrismaClient, TournamentStatus } from '@prisma/client'
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const verificationDate = new Date();
  
  // Create test users with proper verification
  const testUsers = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      password: await bcrypt.hash('password123', 12),
      rank: 'Gold',
      points: 1000,
      emailVerified: verificationDate,
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      username: 'janesmith',
      password: await bcrypt.hash('password123', 12),
      rank: 'Silver',
      points: 750,
      emailVerified: verificationDate,
    },
    {
      name: 'Bob Wilson',
      email: 'bob@example.com',
      username: 'bobwilson',
      password: await bcrypt.hash('password123', 12),
      rank: 'Bronze',
      points: 500,
      emailVerified: verificationDate,
    },
  ]

  // First, delete all existing data in the correct order
  console.log('Cleaning existing data...')
  await prisma.tournamentParticipant.deleteMany()
  await prisma.match.deleteMany()
  await prisma.tournamentBracket.deleteMany()
  await prisma.tournament.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  console.log('Creating verified users...')
  for (const userData of testUsers) {
    await prisma.user.create({
      data: userData
    })
  }

  // Create some test tournaments
  const tournaments = [
    {
      name: 'Summer Championship',
      description: 'Annual summer gaming tournament',
      game: 'League of Legends',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-02'),
      registrationCloseDate: new Date('2024-05-30'),
      prizePool: 1000,
      maxPlayers: 8,
      status: 'UPCOMING' as TournamentStatus,
    },
    {
      name: 'Winter Classic',
      description: 'Winter gaming competition',
      game: 'Valorant',
      startDate: new Date('2024-12-15'),
      endDate: new Date('2024-12-16'),
      registrationCloseDate: new Date('2024-12-13'),
      prizePool: 1500,
      maxPlayers: 16,
      status: 'UPCOMING' as TournamentStatus,
    },
  ]

  console.log('Creating tournaments...')
  // Get the first user to be the creator of tournaments
  const firstUser = await prisma.user.findFirst({
    where: { email: 'john@example.com' },
  })

  if (firstUser) {
    for (const tournamentData of tournaments) {
      await prisma.tournament.create({
        data: {
          ...tournamentData,
          userId: firstUser.id,
        },
      })
    }
  }

  // Verify all test accounts have been properly verified
  const unverifiedUsers = await prisma.user.findMany({
    where: { emailVerified: null }
  })

  if (unverifiedUsers.length > 0) {
    console.error('Warning: Some users remain unverified:', unverifiedUsers.map(u => u.email))
  } else {
    console.log('All users successfully verified!')
  }

  console.log('Seed data inserted successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })