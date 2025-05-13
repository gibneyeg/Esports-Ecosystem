'use client'
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import logo from "../Img/gamers.jpeg";
import cs2 from "../Img/Cs2.webp";
import val from "../Img/Vall.webp"
import league from "../Img/league-of-legends.webp"
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

async function fetchStats() {
  try {
    const response = await fetch('/api/stats', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error("Error fetching stats:", error);
    return null;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState([
    { icon: "trophy", value: null, label: "Total Tournament Prize Pool" },
    { icon: "users", value: null, label: "Total Active Players" },
    { icon: "gamepad", value: null, label: "Total Gaming Events" },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let intervalId;

    const updateStats = async () => {
      setIsLoading(true);
      const dbStats = await fetchStats();

      if (!mounted || !dbStats) return;

      setStats([
        {
          icon: "trophy",
          value: dbStats.totalPrizePool,
          label: "Total Tournament Prize Pool",
        },
        {
          icon: "users",
          value: dbStats.totalPlayers,
          label: "Total Active Players",
        },
        {
          icon: "gamepad",
          value: dbStats.totalTournaments,
          label: "Total Gaming Events",
        },
      ]);
      setIsLoading(false);
    };

    // Initial fetch
    updateStats();

    // Set up polling every 30 seconds
    intervalId = setInterval(updateStats, 30000);

    // Prefetch signup page
    router.prefetch('/signup');
    router.prefetch('/tournament');

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [router]);

  const handleSignup = () => {
    router.push("/signup");
  };

  const gameCategories = [
    {
      title: "FPS Games",
      description: "Competitive shooter tournaments for CS2, Valorant, and more",
      icon: "🎯",
      color: "from-red-500 to-orange-500",
      link: "/tournament?game=fps"
    },
    {
      title: "MOBA",
      description: "Strategic team battles in League of Legends, Dota 2, and similar games",
      icon: "⚔️",
      color: "from-blue-500 to-indigo-600",
      link: "/tournament?game=moba"
    },
    {
      title: "Battle Royale",
      description: "Last player standing competitions in Fortnite, PUBG, and Apex Legends",
      icon: "🏹",
      color: "from-green-500 to-teal-500",
      link: "/tournament?game=battle-royale"
    },
    {
      title: "Fighting Games",
      description: "1v1 combat championships in Street Fighter, Mortal Kombat, and Smash Bros",
      icon: "🥊",
      color: "from-purple-500 to-pink-500",
      link: "/tournament?game=fighting"
    },
  ];

  // Render the icons for the stats section
  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'trophy':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5,3H19A2,2 0 0,1 21,5V7A2,2 0 0,1 19,9H17V11A4,4 0 0,1 13,15H11A4,4 0 0,1 7,11V9H5A2,2 0 0,1 3,7V5A2,2 0 0,1 5,3M7,5V7H9V11A2,2 0 0,0 11,13H13A2,2 0 0,0 15,11V7H17V5H7M5,17H19A2,2 0 0,1 21,19V21A2,2 0 0,1 19,23H5A2,2 0 0,1 3,21V19A2,2 0 0,1 5,17M7,19V21H17V19H7Z" />
          </svg>
        );
      case 'users':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z" />
          </svg>
        );
      case 'gamepad':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6,9H8V11H10V13H8V15H6V13H4V11H6V9M18.5,9A1.5,1.5 0 0,1 20,10.5A1.5,1.5 0 0,1 18.5,12A1.5,1.5 0 0,1 17,10.5A1.5,1.5 0 0,1 18.5,9M15.5,12A1.5,1.5 0 0,1 17,13.5A1.5,1.5 0 0,1 15.5,15A1.5,1.5 0 0,1 14,13.5A1.5,1.5 0 0,1 15.5,12M17,5A7,7 0 0,1 24,12A7,7 0 0,1 17,19C15.04,19 13.27,18.2 12,16.9C10.73,18.2 8.96,19 7,19A7,7 0 0,1 0,12A7,7 0 0,1 7,5H17M7,7A5,5 0 0,0 2,12A5,5 0 0,0 7,17C8.64,17 10.09,16.21 11,15H13C13.91,16.21 15.36,17 17,17A5,5 0 0,0 22,12A5,5 0 0,0 17,7H7Z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      {/* Hero Section with Animated Gradient Overlay */}
      <div className="relative h-screen max-h-[800px] w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${logo.src})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/90" />

        <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight max-w-4xl">
            <span className="block">Compete. Win. Dominate.</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              WarriorTournaments
            </span>
          </h1>

          <p className="text-lg text-gray-300 mb-8 max-w-2xl">
            Your gateway to professional gaming tournaments, prizes, and becoming part of an elite community of competitors
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSignup}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg 
                        shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-1"
            >
              Create Free Account
            </button>
            <button
              onClick={() => router.push('/tournament')}
              className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white 
                        font-medium rounded-lg hover:bg-white/20 transition-all duration-300"
            >
              Explore Tournaments
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section - Floating Cards */}
      <div className="relative z-10 bg-gradient-to-b from-black to-gray-900 py-20">
        <div className="max-w-5xl mx-auto px-4 -mt-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
                    {renderIcon(stat.icon)}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                    ) : (
                      <span>{stat.icon === 'trophy'}{stat.value}</span>)}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section - Timeline Style */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Join tournaments and start competing in just a few simple steps</p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-blue-100 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="md:text-right relative">
                <div className="hidden md:block absolute right-0 top-6 transform translate-x-1/2 w-6 h-6 rounded-full border-4 border-blue-500 bg-white z-10"></div>
                <div className="bg-white p-6 rounded-xl shadow-md md:mr-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg font-bold mb-4 md:ml-auto">1</div>
                  <h3 className="text-xl font-bold mb-2">Create an Account</h3>
                  <p className="text-gray-600">Sign up and build your gaming profile showcasing your skills, achievements, and favorite games.</p>
                </div>
              </div>

              {/* Empty Cell */}
              <div className="hidden md:block"></div>

              {/* Empty Cell */}
              <div className="hidden md:block"></div>

              {/* Step 2 */}
              <div className="relative">
                <div className="hidden md:block absolute left-0 top-6 transform -translate-x-1/2 w-6 h-6 rounded-full border-4 border-blue-500 bg-white z-10"></div>
                <div className="bg-white p-6 rounded-xl shadow-md md:ml-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-lg font-bold mb-4">2</div>
                  <h3 className="text-xl font-bold mb-2">Join Tournaments</h3>
                  <p className="text-gray-600">Browse upcoming events and register for tournaments that match your skill level and gaming interests.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="md:text-right relative">
                <div className="hidden md:block absolute right-0 top-6 transform translate-x-1/2 w-6 h-6 rounded-full border-4 border-blue-500 bg-white z-10"></div>
                <div className="bg-white p-6 rounded-xl shadow-md md:mr-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-lg font-bold mb-4 md:ml-auto">3</div>
                  <h3 className="text-xl font-bold mb-2">Compete & Win</h3>
                  <p className="text-gray-600">Play your matches, climb the bracket, and win prizes while ranking up in the competitive leaderboard.</p>
                </div>
              </div>

              {/* Empty Cell */}
              <div className="hidden md:block"></div>

              {/* Empty Cell */}
              <div className="hidden md:block"></div>

              {/* Step 4 */}
              <div className="relative">
                <div className="hidden md:block absolute left-0 top-6 transform -translate-x-1/2 w-6 h-6 rounded-full border-4 border-blue-500 bg-white z-10"></div>
                <div className="bg-white p-6 rounded-xl shadow-md md:ml-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-lg font-bold mb-4">4</div>
                  <h3 className="text-xl font-bold mb-2">Grow Your Career</h3>
                  <p className="text-gray-600">Build your reputation, connect with other players, and potentially start your esports career through our platform.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section - Card Grid with Gradient Overlays */}
      <div className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Popular Categories</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Compete in your favorite game genres and dominate the leaderboards</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {gameCategories.map((category, index) => (
              <Link href={category.link} key={index} className="group">
                <div className="relative h-64 rounded-xl overflow-hidden shadow-lg transition-all duration-300 transform group-hover:-translate-y-2 group-hover:shadow-xl">
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-90`}></div>
                  <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
                    <div>
                      <div className="text-4xl mb-2">{category.icon}</div>
                      <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                      <p className="text-sm text-white/80">{category.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">View Tournaments</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-2">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Tournaments Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Featured Tournaments</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Check out our most popular upcoming gaming events</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tournament 1 */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="h-48 relative overflow-hidden">
                <Image
                  src={val}
                  alt="val tournament"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white">VALORANT</div>
                <div className="absolute top-4 right-4 bg-green-500 px-3 py-1 rounded-full text-xs font-medium text-white">REGISTERING</div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Summer Championship 2024</h3>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                  </svg>
                  Starts June 1, 2024
                </div>
                <div className="flex justify-between mb-4">
                  <div className="text-sm">
                    <div className="text-gray-500">Prize Pool</div>
                    <div className="font-bold text-green-600">$1,000</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">Participants</div>
                    <div className="font-bold">5/8</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">Format</div>
                    <div className="font-bold">Single Elim</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/tournament/f560bbb5-4cc3-4a3f-a355-32d9781dd3a4')}
                  className="w-full py-2 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>

            {/* Tournament 2 */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="h-48 relative overflow-hidden">
                <Image
                  src={league}
                  alt="league tournament"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white">LEAGUE OF LEGENDS</div>
                <div className="absolute top-4 right-4 bg-orange-500 px-3 py-1 rounded-full text-xs font-medium text-white">CLOSING SOON</div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Spring Masters</h3>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                  </svg>
                  Starts May 15, 2024
                </div>
                <div className="flex justify-between mb-4">
                  <div className="text-sm">
                    <div className="text-gray-500">Prize Pool</div>
                    <div className="font-bold text-green-600">$1,800</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">Participants</div>
                    <div className="font-bold">9/10</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">Format</div>
                    <div className="font-bold">Double Elim</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/tournament/4bc38de4-9d7c-49fe-9404-7c3e7faf5c37')}
                  className="w-full py-2 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>

            {/* Tournament 3 */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="h-48 relative overflow-hidden">
                <Image
                  src={cs2}
                  alt="Counter-Strike 2 Tournament"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white">CS2</div>
                <div className="absolute top-4 right-4 bg-blue-500 px-3 py-1 rounded-full text-xs font-medium text-white">UPCOMING</div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Winter Pro League</h3>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                  </svg>
                  Starts June 15, 2024
                </div>
                <div className="flex justify-between mb-4">
                  <div className="text-sm">
                    <div className="text-gray-500">Prize Pool</div>
                    <div className="font-bold text-green-600">$2,500</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">Participants</div>
                    <div className="font-bold">3/8</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500">Format</div>
                    <div className="font-bold">Single Elim</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/tournament/688e2e0f-3a34-4bc8-a751-54158be41f82')}
                  className="w-full py-2 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/tournament"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              View All Tournaments
              <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Will add when get feedback mayby
      <div className="py-24 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Players Say</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Join thousands of happy gamers competing on our platform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-xl relative">
              <div className="absolute -top-4 -left-4 text-5xl text-blue-500 opacity-50">"</div>
              <p className="text-gray-300 mb-6 relative z-10">WarriorTournaments has been a game changer for me. I've met amazing players and even got noticed by a professional team after winning the Summer Cup!</p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold mr-3">J</div>
                <div>
                  <div className="font-bold">Jason K.</div>
                  <div className="text-sm text-gray-400">Diamond Rank • CS2 Player</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl relative">
              <div className="absolute -top-4 -left-4 text-5xl text-blue-500 opacity-50">"</div>
              <p className="text-gray-300 mb-6 relative z-10">The tournament organization is flawless. Clear brackets, fair matchmaking, and the prize money was in my account just hours after winning!</p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center font-bold mr-3">S</div>
                <div>
                  <div className="font-bold">Sarah M.</div>
                  <div className="text-sm text-gray-400">Platinum Rank • Valorant Player</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl relative">
              <div className="absolute -top-4 -left-4 text-5xl text-blue-500 opacity-50">"</div>
              <p className="text-gray-300 mb-6 relative z-10">I've tried many tournament platforms, but none match the community and competition level here. The ranking system keeps me motivated to improve every day.</p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center font-bold mr-3">M</div>
                <div>
                  <div className="font-bold">Michael T.</div>
                  <div className="text-sm text-gray-400">Grandmaster • League of Legends</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> */}



    </Layout >
  );
} 