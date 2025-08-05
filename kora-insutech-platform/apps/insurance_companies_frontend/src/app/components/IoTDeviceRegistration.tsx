"use client";
import { useState, useEffect } from "react";
import { AUTH_TOKEN_KEY } from "../constants/constant";

interface IoTDevice {
  id: number;
  device_id: string;
  device_type: string;
  device_model: string;
  device_status: string;
  policy_id?: number;
  policy_number?: string;
  policy_holder_name?: string;
  policy_type?: string;
  last_ping?: string;
  battery_level?: number;
  blockchain_registered: boolean;
  assigned_date?: string;
}

interface Policy {
  id: number;
  policy_number: string;
  policy_holder_name: string;
  policy_type: string;
  coverage_amount: number;
}

const IoTDeviceRegistration: React.FC = () => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  // Form state for new device registration
  const [newDevice, setNewDevice] = useState({
    serial_number: "",
    policy_id: "",
  });

  // Form state for device linking
  const [linkForm, setLinkForm] = useState({
    device_id: "",
    policy_id: "",
  });

  // Load devices and policies
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);

      // Load devices
      const devicesResponse = await fetch(
        "http://localhost:3001/api/iot/devices",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        setDevices(devicesData.devices);
      }

      // Load available policies for linking
      const policiesResponse = await fetch(
        "http://localhost:3001/api/iot/policies/available",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (policiesResponse.ok) {
        const policiesData = await policiesResponse.json();
        setPolicies(policiesData.policies);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Register new IoT device
  const registerDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch(
        "http://localhost:3001/api/iot/devices/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newDevice),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setNewDevice({
          serial_number: "",
          policy_id: "",
        });
        setShowRegisterForm(false);
        loadData(); // Reload devices
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error registering device:", error);
      alert("Failed to register device");
    } finally {
      setLoading(false);
    }
  };

  // Link device to policy
  const linkDeviceToPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch(
        "http://localhost:3001/api/iot/devices/link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(linkForm),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(
          `Device successfully linked to policy: ${result.link_details.policy_number}`
        );
        setLinkForm({ device_id: "", policy_id: "" });
        setShowLinkModal(false);
        loadData(); // Reload devices
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error linking device:", error);
      alert("Failed to link device");
    } finally {
      setLoading(false);
    }
  };

  // Unlink device from policy
  const unlinkDevice = async (deviceId: string) => {
    if (
      !confirm("Are you sure you want to unlink this device from its policy?")
    ) {
      return;
    }

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const response = await fetch(
        `http://localhost:3001/api/iot/devices/${deviceId}/unlink`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Device successfully unlinked from policy");
        loadData(); // Reload devices
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error unlinking device:", error);
      alert("Failed to unlink device");
    }
  };

  // Open link modal for specific device
  const openLinkModal = (deviceId: string) => {
    setLinkForm({ device_id: deviceId, policy_id: "" });
    setSelectedDevice(deviceId);
    setShowLinkModal(true);
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "inactive":
        return "text-red-600 bg-red-100";
      case "maintenance":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case "car_tracker":
        return "🚗";
      case "health_monitor":
        return "❤️";
      case "home_sensor":
        return "🏠";
      case "bike_tracker":
        return "🚲";
      default:
        return "📱";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            IoT Device Management
          </h2>
          <p className="text-gray-600">
            Register IoT devices and link them to insurance policies
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowRegisterForm(!showRegisterForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showRegisterForm ? "Cancel" : "Register Device"}
          </button>
          <button
            onClick={() => setShowLinkModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Link Device to Policy
          </button>
        </div>
      </div>

      {/* Register Device Form */}
      {showRegisterForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-4">
            Register New IoT Device
          </h3>
          <form onSubmit={registerDevice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device Serial Number
              </label>
              <input
                type="text"
                value={newDevice.serial_number}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, serial_number: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter device serial number (e.g., KORA-001)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Policy (Optional)
              </label>
              <select
                value={newDevice.policy_id}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, policy_id: e.target.value })
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a policy to link (optional)</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.policy_number} - {policy.policy_holder_name} (
                    {policy.policy_type})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                You can link the device to a policy now or do it later
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Registering..." : "Register Device"}
              </button>
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Link Device Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Link Device to Policy
            </h3>
            <form onSubmit={linkDeviceToPolicy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Device
                </label>
                <select
                  value={linkForm.device_id}
                  onChange={(e) =>
                    setLinkForm({ ...linkForm, device_id: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a device...</option>
                  {devices
                    .filter((d) => !d.policy_id)
                    .map((device) => (
                      <option key={device.device_id} value={device.device_id}>
                        {device.device_id} ({device.device_type})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Policy
                </label>
                <select
                  value={linkForm.policy_id}
                  onChange={(e) =>
                    setLinkForm({ ...linkForm, policy_id: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a policy...</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.policy_number} - {policy.policy_holder_name} (
                      {policy.policy_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Linking..." : "Link Device"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Devices List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Registered IoT Devices</h3>
          <p className="text-gray-600">
            Total devices: {devices.length} | Linked:{" "}
            {devices.filter((d) => d.policy_id).length} | Unlinked:{" "}
            {devices.filter((d) => !d.policy_id).length}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No IoT devices registered yet.</p>
            <p className="text-sm">Click "Register Device" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Linked Policy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">
                          {getDeviceTypeIcon(device.device_type)}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {device.device_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {device.device_type}{" "}
                            {device.device_model && `- ${device.device_model}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          device.device_status
                        )}`}
                      >
                        {device.device_status}
                      </span>
                      {device.blockchain_registered && (
                        <div className="text-xs text-green-600 mt-1">
                          ⛓️ On-chain
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {device.policy_number ? (
                        <div>
                          <div className="font-medium text-green-600">
                            ✅ {device.policy_number}
                          </div>
                          <div className="text-gray-500">
                            {device.policy_holder_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {device.policy_type}
                          </div>
                        </div>
                      ) : (
                        <span className="text-red-500 font-medium">
                          ❌ Not linked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {device.assigned_date
                        ? new Date(device.assigned_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {!device.policy_id ? (
                        <button
                          onClick={() => openLinkModal(device.device_id)}
                          className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded transition-colors"
                        >
                          Link to Policy
                        </button>
                      ) : (
                        <button
                          onClick={() => unlinkDevice(device.device_id)}
                          className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
                        >
                          Unlink
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default IoTDeviceRegistration;
