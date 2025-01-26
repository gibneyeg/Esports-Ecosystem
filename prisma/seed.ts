// prisma/seed.ts
import { PrismaClient, TournamentStatus, User } from '@prisma/client'
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
      points: 1500,
      emailVerified: verificationDate,
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      username: 'janesmith',
      password: await bcrypt.hash('password123', 12),
      rank: 'Platinum',
      points: 2200,
      emailVerified: verificationDate,
    },
    {
      name: 'Bob Wilson',
      email: 'bob@example.com',
      username: 'bobwilson',
      password: await bcrypt.hash('password123', 12),
      rank: 'Bronze',
      points: 450,
      emailVerified: verificationDate,
    },
    {
      name: 'Alice Cooper',
      email: 'alice@example.com',
      username: 'alicec',
      password: await bcrypt.hash('password123', 12),
      rank: 'Diamond',
      points: 3100,
      emailVerified: verificationDate,
    },
    {
      name: 'Mike Johnson',
      email: 'mike@example.com',
      username: 'mikej',
      password: await bcrypt.hash('password123', 12),
      rank: 'Master',
      points: 4200,
      emailVerified: verificationDate,
    },
    {
      name: 'Sarah Lee',
      email: 'sarah@example.com',
      username: 'sarahlee',
      password: await bcrypt.hash('password123', 12),
      rank: 'Silver',
      points: 750,
      emailVerified: verificationDate,
    },
    {
      name: 'Tom Harris',
      email: 'tom@example.com',
      username: 'tomh',
      password: await bcrypt.hash('password123', 12),
      rank: 'Grandmaster',
      points: 5100,
      emailVerified: verificationDate,
    },
    {
      name: 'Emma Davis',
      email: 'emma@example.com',
      username: 'emmad',
      password: await bcrypt.hash('password123', 12),
      rank: 'Diamond',
      points: 3300,
      emailVerified: verificationDate,
    }
  ]

  // First, delete all existing data in the correct order
  console.log('Cleaning existing data...')
  await prisma.tournamentWinner.deleteMany()
  await prisma.tournamentParticipant.deleteMany()
  await prisma.match.deleteMany()
  await prisma.tournamentBracket.deleteMany()
  await prisma.tournament.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  console.log('Creating verified users...')
  const createdUsers: Record<string, User> = {}
  for (const userData of testUsers) {
    const user = await prisma.user.create({
      data: userData
    })
    createdUsers[userData.email] = user
  }

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
    {
      name: 'CS2 Pro League',
      description: 'Professional CS2 tournament',
      game: 'CS2',
      startDate: new Date('2024-01-10'),
      endDate: new Date('2024-01-11'),
      registrationCloseDate: new Date('2024-01-09'),
      prizePool: 1200,
      maxPlayers: 8,
      status: 'COMPLETED' as TournamentStatus,
    },
    {
      name: 'Valorant Masters',
      description: 'Elite Valorant competition',
      game: 'Valorant',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-16'),
      registrationCloseDate: new Date('2024-01-14'),
      prizePool: 2000,
      maxPlayers: 8,
      status: 'COMPLETED' as TournamentStatus,
    },
    {
      name: 'League Championship',
      description: 'Premier League tournament',
      game: 'League of Legends',
      startDate: new Date('2024-01-05'),
      endDate: new Date('2024-01-06'),
      registrationCloseDate: new Date('2024-01-04'),
      prizePool: 1800,
      maxPlayers: 8,
      status: 'COMPLETED' as TournamentStatus,
    },
    {
      name: 'CS2 Masters Cup',
      description: 'Elite CS2 competition',
      game: 'CS2',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      registrationCloseDate: new Date('2023-12-31'),
      prizePool: 2500,
      maxPlayers: 8,
      status: 'COMPLETED' as TournamentStatus,
    }
  ]

  console.log('Creating tournaments...')
  const firstUser = createdUsers['tom@example.com']
  if (!firstUser) throw new Error('First user not found')
  
  for (const tournamentData of tournaments) {
    const tournament = await prisma.tournament.create({
      data: {
        ...tournamentData,
        userId: firstUser.id,
      },
    })

    // Add participants and winners for completed tournaments
    if (tournamentData.status === 'COMPLETED') {
      let participants: User[] = [];

      // Assign different participants and winners for each tournament
      if (tournamentData.name === 'CS2 Pro League') {
        participants = [
          createdUsers['alice@example.com'],   // 1st
          createdUsers['tom@example.com'],     // 2nd
          createdUsers['emma@example.com'],    // 3rd
          createdUsers['john@example.com'],    // participant
          createdUsers['sarah@example.com'],   // participant
        ];
      } 
      else if (tournamentData.name === 'Valorant Masters') {
        participants = [
          createdUsers['mike@example.com'],    // 1st
          createdUsers['jane@example.com'],    // 2nd
          createdUsers['bob@example.com'],     // 3rd
          createdUsers['emma@example.com'],    // participant
          createdUsers['sarah@example.com'],   // participant
        ];
      }
      else if (tournamentData.name === 'League Championship') {
        participants = [
          createdUsers['tom@example.com'],     // 1st
          createdUsers['alice@example.com'],   // 2nd
          createdUsers['john@example.com'],    // 3rd
          createdUsers['sarah@example.com'],   // participant
          createdUsers['mike@example.com'],    // participant
        ];
      }
      else if (tournamentData.name === 'CS2 Masters Cup') {
        participants = [
          createdUsers['emma@example.com'],    // 1st
          createdUsers['mike@example.com'],    // 2nd
          createdUsers['jane@example.com'],    // 3rd
          createdUsers['bob@example.com'],     // participant
          createdUsers['tom@example.com'],     // participant
        ];
      }

      // Add all participants
      for (const participant of participants) {
        await prisma.tournamentParticipant.create({
          data: {
            tournamentId: tournament.id,
            userId: participant.id,
          }
        })
      }

      // Add first 3 participants as winners
      for (let i = 0; i < 3; i++) {
        await prisma.tournamentWinner.create({
          data: {
            tournamentId: tournament.id,
            userId: participants[i].id,
            position: i + 1,
            prizeMoney: tournament.prizePool * (i === 0 ? 0.5 : i === 1 ? 0.3 : 0.2)
          }
        })
      }
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