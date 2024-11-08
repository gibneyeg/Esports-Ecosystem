'use client'
import React, { useState } from "react";

export default function ImageCarousel({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length
    );
  };

  const currentImages = [
    images[(currentIndex) % images.length],
    images[(currentIndex + 1) % images.length],
    images[(currentIndex + 2) % images.length],
    images[(currentIndex + 3) % images.length],
  ];

  return (
    <div className="flex justify-center items-center space-x-4 w-full max-w-4xl mx-auto">
      {/* Left Button */}
      <button
        onClick={prevImage}
        className="px-4 py-2 text-gray-600 bg-white shadow-md hover:bg-gray-200 z-10"
      >
        &lt;
      </button>

      {/* Image Container */}
      <div className="flex justify-center space-x-4">
        {currentImages.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`Image ${index + currentIndex}`}
            className="w-[175px] h-[200px] object-cover rounded-md"
          />
        ))}
      </div>

      {/* Right Button */}
      <button
        onClick={nextImage}
        className="px-4 py-2 text-gray-600 bg-white shadow-md hover:bg-gray-200 z-10"
      >
        &gt;
      </button>
    </div>
  );
}
