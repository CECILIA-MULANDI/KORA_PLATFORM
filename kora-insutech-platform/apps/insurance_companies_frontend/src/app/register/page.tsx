"use client";
import { useState } from "react";
import { API_URL } from "../constants/constant";
const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    if (
      !name ||
      !email ||
      !phone ||
      !address ||
      !password ||
      !confirmPassword
    ) {
      setMessage("Please fill in all the fields");
      setMessageType("error");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setMessageType("error");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long");
      setMessageType("error");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/register/insurance-company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          password,
          confirmPassword,
        }),
      });
      const data = await response.json();
      console.log(data);
      if (response.ok) {
        setMessage(
          "Registration successful!Insurance company has been created!"
        );
        setMessageType("success");
        // reset the form
        setName("");
        setEmail("");
        setPhone("");
        setAddress("");
        setPassword("");
        setConfirmPassword("");
      } else {
        setMessage(data.error || "Registration failed");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Registration failed");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-t-3xl shadow-lg px-6 py-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Register</h1>
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-center ${
              messageType === "success"
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {message}
          </div>
        )}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <label htmlFor="name" className="mb-1 font-medium">
              Insurance Company Name:
            </label>
            <input
              type="text"
              id="name"
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="email" className="mb-1 font-medium">
              Email:
            </label>
            <input
              type="email"
              id="email"
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="phone" className="mb-1 font-medium">
              Phone:
            </label>
            <input
              type="tel"
              id="phone"
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="address" className="mb-1 font-medium">
              Address:
            </label>
            <input
              type="text"
              id="address"
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="password" className="mb-1 font-medium">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="password" className="mb-1 font-medium">
              Confirm Password:
            </label>
            <input
              type="password"
              id="password"
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`mt-4 font-semibold px-8 py-2 rounded-full shadow transition ${
              isLoading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
