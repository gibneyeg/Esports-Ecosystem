import React from "react";
import ContactForm from "/src/components/ContactForm";
import Layout from "../../components/Layout";
export default function Contact() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12"></div>
        {/* Removed the extra container div with border and shadow */}
        <ContactForm />
      </div>
    </Layout>
  );
}
