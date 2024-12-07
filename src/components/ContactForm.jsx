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
  const [focusedField, setFocusedField] = useState(null);

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
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Get in Touch
        </h2>
        <p className="text-gray-600 text-lg max-w-xl mx-auto">
          We&apos;d love to hear from you. Let us know how we can help.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
      >
        <div className="space-y-6">
          <div className="relative">
            <label
              htmlFor="name"
              className={`absolute left-4 transition-all duration-200 ${
                focusedField === "name" || formData.name
                  ? "-top-3 text-xs bg-white px-2 text-gray-700"
                  : "top-3 text-gray-400"
              }`}
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-0 transition-colors duration-200"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="email"
              className={`absolute left-4 transition-all duration-200 ${
                focusedField === "email" || formData.email
                  ? "-top-3 text-xs bg-white px-2 text-gray-700"
                  : "top-3 text-gray-400"
              }`}
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-0 transition-colors duration-200"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="subject"
              className={`absolute left-4 transition-all duration-200 ${
                focusedField === "subject" || formData.subject
                  ? "-top-3 text-xs bg-white px-2 text-gray-700"
                  : "top-3 text-gray-400"
              }`}
            >
              Subject
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              onFocus={() => setFocusedField("subject")}
              onBlur={() => setFocusedField(null)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-0 transition-colors duration-200"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="message"
              className={`absolute left-4 transition-all duration-200 ${
                focusedField === "message" || formData.message
                  ? "-top-3 text-xs bg-white px-2 text-gray-700"
                  : "top-3 text-gray-400"
              }`}
            >
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              onFocus={() => setFocusedField("message")}
              onBlur={() => setFocusedField(null)}
              required
              rows="5"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-0 transition-colors duration-200 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full bg-black text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[0.99]"
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
              Sending...
            </span>
          ) : (
            "Send Message"
          )}
        </button>

        {status === "success" && (
          <div className="bg-gray-50 border-l-4 border-gray-900 p-4 rounded-lg">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  Thank you! Your message has been sent successfully.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Sorry, there was an error sending your message. Please try
                  again.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ContactForm;
