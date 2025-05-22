"use client";
import React, { useState } from "react";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus("success");
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header Section */}
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Get in Touch
        </h2>
        <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto px-4">
          We&apos;d love to hear from you. Let us know how we can help.
        </p>
      </div>

      {/* Contact Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 sm:space-y-8 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-lg border border-gray-100"
      >
        <div className="space-y-4 sm:space-y-6">
          {/* Name Field */}
          <div className="space-y-1">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 sm:py-4 text-base border-2 border-gray-200 rounded-xl 
                         focus:border-gray-900 focus:ring-0 transition-colors duration-200
                         placeholder:text-gray-400 touch-manipulation"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 sm:py-4 text-base border-2 border-gray-200 rounded-xl 
                         focus:border-gray-900 focus:ring-0 transition-colors duration-200
                         placeholder:text-gray-400 touch-manipulation"
              placeholder="Enter your email address"
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-1">
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 sm:py-4 text-base border-2 border-gray-200 rounded-xl 
                         focus:border-gray-900 focus:ring-0 transition-colors duration-200
                         placeholder:text-gray-400 touch-manipulation"
              placeholder="What is this about?"
            />
          </div>

          {/* Message Field */}
          <div className="space-y-1">
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows="5"
              className="w-full px-4 py-3 sm:py-4 text-base border-2 border-gray-200 rounded-xl 
                         focus:border-gray-900 focus:ring-0 transition-colors duration-200 
                         resize-none placeholder:text-gray-400 touch-manipulation min-h-[120px]"
              placeholder="Tell us more about your inquiry..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Please provide as much detail as possible to help us assist you better.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full bg-black text-white py-4 sm:py-5 px-6 rounded-xl font-medium 
                     text-base sm:text-lg hover:bg-gray-900 focus:outline-none focus:ring-2 
                     focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 
                     disabled:cursor-not-allowed transition-all duration-200 
                     transform hover:scale-[0.99] active:scale-[0.97] touch-manipulation
                     min-h-[48px] flex items-center justify-center"
        >
          {status === "sending" ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Sending Message...
            </span>
          ) : (
            "Send Message"
          )}
        </button>

        {/* Success Message */}
        {status === "success" && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg animate-fadeIn">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 mb-1">
                  Message sent successfully!
                </h3>
                <p className="text-sm text-green-700">
                  Thank you for reaching out. We&apos;ll get back to you as soon as possible.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {status === "error" && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg animate-fadeIn">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Message failed to send
                </h3>
                <p className="text-sm text-red-700">
                  Sorry, there was an error sending your message. Please try again or contact us directly.
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setStatus("")}
                    className="text-sm text-red-800 hover:text-red-900 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </form>
    </div>
  );
};

export default ContactForm;