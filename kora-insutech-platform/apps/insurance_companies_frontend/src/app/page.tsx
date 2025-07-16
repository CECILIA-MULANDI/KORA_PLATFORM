"use client";
import { useState } from "react";
import LoginForm from "./login/LoginForm";
import RegisterForm from "./register/RegisterForm";

export default function Home() {
  const [showLogin, setShowLogin] = useState(true);
  return (
    <div className="min-h-screen flex">
      {/* Left side: Images */}
      <div className="hidden md:flex flex-col items-center justify-center w-1/2 bg-blue-50 p-8">
        {/* Placeholder car SVG */}
        <svg
          width="180"
          height="100"
          viewBox="0 0 180 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="20" y="60" width="140" height="30" rx="10" fill="#4B5563" />
          <rect x="40" y="40" width="100" height="30" rx="8" fill="#9CA3AF" />
          <circle cx="50" cy="90" r="10" fill="#1F2937" />
          <circle cx="130" cy="90" r="10" fill="#1F2937" />
        </svg>
        {/* Building SVG (window.svg) */}
        <img src="/window.svg" alt="Building" className="mt-8 w-24 h-24" />
      </div>
      {/* Right side: Forms */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-white p-8">
        <div className="mb-8 flex gap-4">
          <button
            className={`px-6 py-2 rounded-full font-semibold shadow transition ${
              showLogin
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setShowLogin(true)}
          >
            Login
          </button>
          <button
            className={`px-6 py-2 rounded-full font-semibold shadow transition ${
              !showLogin
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setShowLogin(false)}
          >
            Sign Up
          </button>
        </div>
        {showLogin ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}
