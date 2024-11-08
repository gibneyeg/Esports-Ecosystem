import React from "react";
import Layout from "/src/components/Layout.jsx";

export default function Tournaments() {
  const featuredTournaments = [
    {
      name: "Sparking Zero",
      date: "October 2024",
      image: "/img/sparkingZero.jpeg",
      description:
        "An epic showdown featuring top players from around the world.",
    },
    {
      name: "Tekken 8 Tournament",
      date: "November 2024",
      image: "/img/tekken-8__00646.jpg",
      description: "The most anticipated Tekken 8 tournament of the year.",
    },
    {
      name: "LoL World Championship",
      date: "November 2024",
      image: "/img/LoL.jpeg",
      description: "League of Legends championship with global participation.",
    },
    {
      name: "Street Fighter 6 Tournament",
      date: "December 2024",
      image: "/img/Street_Fighter_6_box_art.jpg",
      description: "A legendary tournament for Street Fighter fans.",
    },
  ];

  const registrationClosingSoon = [
    {
      name: "Street Fighter 6 Showdown",
      date: "December 2024",
      image: "/img/Street_Fighter_6_box_art.jpg",
      closingDate: "November 15, 2024",
    },
    {
      name: "FC25 Esports",
      date: "January 2025",
      image: "/img/FC25-Cover-1954e56.jpg",
      closingDate: "December 10, 2024",
    },
    {
      name: "FIFA 24 Tournament",
      date: "January 2025",
      image: "/img/sparkingZero.jpeg",
      closingDate: "November 25, 2024",
    },
  ];

  return (
    <Layout>
      {/* Main Title */}
      <div className="text-center mt-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Upcoming Esports Tournaments
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Check out the featured tournaments and those with registration closing
          soon.
        </p>
      </div>

      <section className="mt-8 px-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Featured Tournaments
        </h2>
        <div className="flex overflow-x-auto space-x-4 py-4">
          {featuredTournaments.map((tournament, index) => (
            <div
              key={index}
              className="flex-none bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 w-64"
            >
              <img
                src={tournament.image}
                alt={tournament.name}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-800">
                {tournament.name}
              </h3>
              <p className="text-gray-500 text-sm mt-2">{tournament.date}</p>
              <p className="text-gray-600 mt-2 text-sm">
                {tournament.description}
              </p>
              <button className="mt-4 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 text-xs">
                Learn More
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 px-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Registration Closing Soon
        </h2>
        <div className="flex overflow-x-auto space-x-4 py-4">
          {registrationClosingSoon.map((tournament, index) => (
            <div
              key={index}
              className="flex-none bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 w-64"
            >
              <img
                src={tournament.image}
                alt={tournament.name}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-800">
                {tournament.name}
              </h3>
              <p className="text-gray-500 text-sm mt-2">{tournament.date}</p>
              <p className="text-red-500 font-semibold mt-2 text-sm">
                Registration ends: {tournament.closingDate}
              </p>
              <button className="mt-4 px-4 py-2 text-white bg-orange-600 rounded-md hover:bg-orange-700 text-xs">
                Register Now
              </button>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
