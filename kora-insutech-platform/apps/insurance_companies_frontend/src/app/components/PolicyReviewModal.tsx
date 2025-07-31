"use client";
import { useState } from "react";

interface PolicyReviewModalProps {
  extraction: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tempId: string, corrections: any) => void;
}

export default function PolicyReviewModal({ extraction, isOpen, onClose, onConfirm }: PolicyReviewModalProps) {
  const [formData, setFormData] = useState(extraction?.structured_data || {});
  const [saving, setSaving] = useState(false);

  if (!isOpen || !extraction) return null;

  const handleSave = async () => {
    setSaving(true);
    await onConfirm(extraction.temp_id, formData);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Review Policy Data</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Policy Number</label>
            <input
              type="text"
              value={formData.policy_number || ""}
              onChange={(e) => setFormData({...formData, policy_number: e.target.value})}
              className="w-full border rounded p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Policy Holder Name</label>
            <input
              type="text"
              value={formData.policy_holder_name || ""}
              onChange={(e) => setFormData({...formData, policy_holder_name: e.target.value})}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Policy Type</label>
            <select
              value={formData.policy_type || ""}
              onChange={(e) => setFormData({...formData, policy_type: e.target.value})}
              className="w-full border rounded p-2"
            >
              <option value="">Select Type</option>
              <option value="auto">Auto</option>
              <option value="health">Health</option>
              <option value="home">Home</option>
              <option value="life">Life</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Coverage Amount</label>
            <input
              type="number"
              value={formData.coverage_amount || ""}
              onChange={(e) => setFormData({...formData, coverage_amount: parseFloat(e.target.value)})}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Premium Amount</label>
            <input
              type="number"
              value={formData.premium_amount || ""}
              onChange={(e) => setFormData({...formData, premium_amount: parseFloat(e.target.value)})}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.policy_holder_email || ""}
              onChange={(e) => setFormData({...formData, policy_holder_email: e.target.value})}
              className="w-full border rounded p-2"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}