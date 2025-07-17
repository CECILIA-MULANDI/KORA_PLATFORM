"use client";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";

const DashboardHeader = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Kora Insurance Platform
            </h1>
          </div>

          {/* Navigation Menu */}
          <nav className="hidden md:flex space-x-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
            >
              Dashboard
            </button>
            <button
              className="text-gray-400 cursor-not-allowed px-3 py-2 rounded-md text-sm font-medium"
              disabled
            >
              Policies
            </button>
            <button
              className="text-gray-400 cursor-not-allowed px-3 py-2 rounded-md text-sm font-medium"
              disabled
            >
              Quotes
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
            >
              Profile
            </button>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <span className="text-sm text-gray-700">
                Welcome, {user?.insurance_company_name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
