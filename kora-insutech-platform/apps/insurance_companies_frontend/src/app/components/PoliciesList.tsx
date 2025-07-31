import { useState, useEffect } from "react";
import { AUTH_TOKEN_KEY } from "../constants/constant";

// Add Policy type definition if it doesn't exist
interface Policy {
  id: number;
  policy_number: string;
  policy_holder_name: string;
  policy_type: string;
  coverage_amount: number;
  created_at: string;
}

export default function PoliciesList() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("PoliciesList component rendered, policies:", policies);
  console.log("Loading state:", loading);

  useEffect(() => {
    console.log("PoliciesList useEffect triggered");
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    console.log("=== FETCH POLICIES DEBUG ===");
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      console.log("Token exists:", !!token);

      // Log the actual token (first 20 chars for security)
      console.log(
        "Token preview:",
        token ? token.substring(0, 20) + "..." : "null"
      );

      const response = await fetch("http://localhost:3001/api/policies", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("API Response:", data);
        console.log("Policies count:", data.policies?.length || 0);
        console.log("First policy:", data.policies?.[0]);
        setPolicies(data.policies || []);
      } else {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        setError(`Failed to fetch policies: ${response.status}`);
      }
    } catch (err) {
      console.error("Network error:", err);
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    console.log("Rendering loading state");
    return <div className="text-center py-8">Loading policies...</div>;
  }

  if (error) {
    console.log("Rendering error state");
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  console.log("About to render policies, count:", policies.length);
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Confirmed Policies</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Policy #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Holder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Coverage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {policies.map((policy) => (
              <tr key={policy.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {policy.policy_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {policy.policy_holder_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                  {policy.policy_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  ₹{policy.coverage_amount?.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {new Date(policy.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
