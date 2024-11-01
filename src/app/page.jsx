import React from 'react';
import Layout from "../components/Layout.jsx";
import logo from "../Img/gamers.jpeg"; // Adjust path as needed

export default function HomePage() {
  return (
    <Layout>
      <div
        className="h-[80vh] w-screen bg-fixed bg-cover bg-center"
        style={{
          backgroundImage: `url(${logo.src})`,
          margin: 0, // Ensure no margins
        }}
      >
        <div className="bg-black bg-opacity-50 flex items-center justify-center h-full">
          <div className="text-white text-center p-10">
            <h1 className="text-4xl font-bold">Welcome to the Esports Ecosystem</h1>
            <p className="mt-4">This is the homepage awooga</p>
          </div>
        </div>
      </div>
      <div className="py-10">
        {/* Additional content below the image */}
        <p className="text-center text-lg">Here is some additional content below the image.</p>
      </div>
    </Layout>
  );
}
