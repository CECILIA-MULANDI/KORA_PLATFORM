"use client";
import { useState } from "react";
import { API_URL } from "../constants/constant";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const { login } = useAuth();
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const response = await fetch(`${API_URL}/login/insurance-company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      login(data.token, data.user);
      router.push("/dashboard");
    } else {
      setMessage(data.message || data.error || "Login failed");
      setMessageType("error");
    }
    setIsLoading(false);
  };
  return (
    <div className="bg-white rounded-t-3xl shadow-lg px-6 py-10 w-full max-w-md">
      <h1 className="text-3xl font-bold text-center mb-8">Login</h1>
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
          <label htmlFor="password" className="mb-1 font-medium">
            Password
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
        <button
          type="submit"
          disabled={isLoading}
          className={`mt-4 font-semibold px-8 py-2 rounded-full shadow transition ${
            isLoading
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};
export default LoginForm;
