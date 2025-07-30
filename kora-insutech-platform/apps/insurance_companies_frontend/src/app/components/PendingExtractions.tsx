"use client";
import { useState, useEffect } from "react";

interface PendingExtraction {
  temp_id: string;
  original_filename: string;
  structured_data: any;
  confidence_score: number;
  created_at: string;
}

export default function PendingExtractions() {
  const [extractions, setExtractions] = useState<PendingExtraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingExtractions();
  }, []);

  const fetchPendingExtractions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/policies/pending-extractions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExtractions(data.extractions || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending extractions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending extractions...</div>;
  }

  if (extractions.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <div className="text-gray-500 mb-4">No pending extractions</div>
        <div className="text-sm text-gray-400">
          Upload a policy document to see extractions here
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Pending Extractions</h2>
      </div>
      
      <div className="divide-y">
        {extractions.map((extraction) => (
          <div key={extraction.temp_id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">{extraction.original_filename}</h3>
                <div className="text-sm text-gray-500">
                  {new Date(extraction.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                extraction.confidence_score >= 80 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {extraction.confidence_score}% Confidence
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Policy #:</span>
                <div>{extraction.structured_data.policy_number || 'N/A'}</div>
              </div>
              <div>
                <span className="font-medium">Holder:</span>
                <div>{extraction.structured_data.policy_holder_name || 'N/A'}</div>
              </div>
              <div>
                <span className="font-medium">Type:</span>
                <div>{extraction.structured_data.policy_type || 'N/A'}</div>
              </div>
              <div>
                <span className="font-medium">Coverage:</span>
                <div>{extraction.structured_data.coverage_amount || 'N/A'}</div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Review
              </button>
              <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                Confirm
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}