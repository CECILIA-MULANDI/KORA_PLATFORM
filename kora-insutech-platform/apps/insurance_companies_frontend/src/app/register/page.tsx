"use client";
import { useState } from "react";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-t-3xl shadow-lg p-8 w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-center mb-8">Register</h1>
        <form className="flex flex-col gap-6 items-center">
          <div className="flex flex-col w-56">
            <label htmlFor="name" className="mb-1 font-medium">
              Insurance Company Name:
            </label>
            <input
              type="text"
              id="name"
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col w-56">
            <label htmlFor="email" className="mb-1 font-medium">
              Email:
            </label>
            <input
              type="email"
              id="email"
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col w-56">
            <label htmlFor="phone" className="mb-1 font-medium">
              Phone:
            </label>
            <input
              type="tel"
              id="phone"
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col w-56">
            <label htmlFor="address" className="mb-1 font-medium">
              Address:
            </label>
            <input
              type="text"
              id="address"
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="flex flex-col w-56">
            <label htmlFor="password" className="mb-1 font-medium">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white font-semibold px-8 py-2 rounded-full shadow hover:bg-blue-700 transition"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
