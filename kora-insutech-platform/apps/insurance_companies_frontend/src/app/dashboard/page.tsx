"use client";
import DashboardLayout from "../components/DashboardLayout";
import PolicyUpload from "../components/PolicyUpload";
import { useAuth } from "../contexts/AuthContext";
import PendingExtractions from "../components/PendingExtractions";
import PoliciesList from "../components/PoliciesList";
import IoTDeviceRegistration from "../components/IoTDeviceRegistration";
import { useState } from "react";

const Dashboard = () => {
  const { user } = useAuth(); // Add this line to get user from context
  const [showUpload, setShowUpload] = useState(false); // Add this for upload toggle
  const [showIoT, setShowIoT] = useState(false); // Add this for IoT toggle

  console.log("Dashboard component rendering");

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome, {user?.insurance_company_name}!
            </h2>
            <p className="text-gray-600 mb-8">
              Manage your insurance policies, quotes, and company information
              from here.
            </p>

            {/* Company Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4">
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">
                    Company Name
                  </p>
                  <p className="text-lg text-blue-900 font-semibold">
                    {user?.insurance_company_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">
                    Email Address
                  </p>
                  <p className="text-lg text-blue-900 font-semibold">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <PendingExtractions />
              {console.log("About to render PoliciesList")}
              <PoliciesList />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium">Upload Policies</h3>
                    <p className="text-blue-100 text-sm">
                      Add new insurance policies
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className="mt-4 bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition"
                >
                  {showUpload ? "Hide Upload" : "Upload Policy"}
                </button>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium">Generate Quotes</h3>
                    <p className="text-green-100 text-sm">
                      Create insurance quotes
                    </p>
                  </div>
                </div>
                <button className="mt-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-md text-sm font-medium transition">
                  Coming Soon
                </button>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium">IoT Devices</h3>
                    <p className="text-orange-100 text-sm">
                      Manage tracking devices
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIoT(!showIoT)}
                  className="mt-4 bg-white text-orange-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-50 transition"
                >
                  {showIoT ? "Hide Devices" : "Manage Devices"}
                </button>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium">Profile Settings</h3>
                    <p className="text-purple-100 text-sm">
                      Manage company profile
                    </p>
                  </div>
                </div>
                <button className="mt-4 bg-white text-purple-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-50 transition">
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Upload Section - Shows when button is clicked */}
            {showUpload && (
              <div className="mt-8">
                <PolicyUpload />
              </div>
            )}

            {/* IoT Device Management Section - Shows when button is clicked */}
            {showIoT && (
              <div className="mt-8">
                <IoTDeviceRegistration />
              </div>
            )}

            {/* Stats Section */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Quick Stats
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Active Policies</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Quotes Generated</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">0</div>
                  <div className="text-sm text-gray-600">Pending Claims</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">$0</div>
                  <div className="text-sm text-gray-600">Total Premium</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
