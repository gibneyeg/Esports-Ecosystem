// src/app/contact/page.jsx
import React from "react";
import Layout from "/src/components/Layout.jsx";
import ContactForm from "/src/components/ContactForm";

export default function Contact() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
        <p className="mb-8">
          We'd love to hear from you. Send us a message and we'll respond as
          soon as possible.
        </p>
        <ContactForm />
      </div>
    </Layout>
  );
}
