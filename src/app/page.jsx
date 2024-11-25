"use client";
import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import logo from "../Img/gamers.jpeg";
import { useRouter } from "next/navigation";

async function fetchStats() {
  try {
    const response = await fetch("/api/stats");
    if (!response.ok) {
      throw new Error("Failed to fetch stats");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching stats:", error);
    return null;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState([
    { icon: "🏆", value: "...", label: "Tournament Prize Pool" },
    { icon: "👥", value: "...", label: "Active Players" },
    { icon: "🎮", value: "...", label: "Tournaments" },
  ]);

  useEffect(() => {
    const loadStats = async () => {
      const dbStats = await fetchStats();
      if (dbStats) {
        setStats([
          {
            icon: "🏆",
            value: dbStats.totalPrizePool,
            label: "Tournament Prize Pool",
          },
          {
            icon: "👥",
            value: dbStats.totalPlayers,
            label: "Active Players",
          },
          {
            icon: "🎮",
            value: dbStats.totalTournaments,
            label: "Gaming Events",
          },
        ]);
      }
    };
    loadStats();
  }, []);

  const handleSignup = () => {
    router.push("/signup");
  };

  const gameCategories = [
    {
      title: "FPS Games",
      description: "Competitive shooter tournaments",
      icon: "🎯",
    },
    { title: "MOBA", description: "Strategic team-based battles", icon: "⚔️" },
    {
      title: "Battle Royale",
      description: "Last player standing competitions",
      icon: "🏹",
    },
    {
      title: "Fighting Games",
      description: "1v1 combat championships",
      icon: "🥊",
    },
  ];

  return (
    <Layout>
      <div
        className="h-screen w-full bg-fixed bg-cover bg-center relative"
        style={{
          backgroundImage: `url(${logo.src})`,
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="text-white text-center p-8 max-w-4xl">
            <h1 className="text-6xl font-bold mb-6">
              Welcome to WarriorTournaments
            </h1>
            <p className="text-xl mb-8">
              Your gateway to professional gaming, tournaments, and community
            </p>
            <button
              onClick={handleSignup}
              className="bg-white text-black hover:bg-gray-200 font-bold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Join Now
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="border border-gray-200 p-6 rounded-lg text-center hover:border-gray-400 transition-colors duration-200"
              >
                <div className="text-4xl mb-4">{stat.icon}</div>
                <div className="text-3xl font-bold text-black mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="py-16 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Popular Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gameCategories.map((category, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="text-3xl mb-4">{category.icon}</div>
                <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                <p className="text-gray-600 mb-4">{category.description}</p>
                <a
                  href="#"
                  className="text-black hover:text-gray-600 inline-flex items-center"
                >
                  Learn More →
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
