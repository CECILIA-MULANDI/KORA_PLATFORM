"use client";
import { useState, useRef } from "react";
import { API_URL, AUTH_TOKEN_KEY } from "../constants/constant";

interface ExtractionResult {
  temp_id: string;
  extracted_data: any;
  confidence_score: number;
  extraction_status: string;
}

export default function PolicyUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editableData, setEditableData] = useState<any>({});

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/tiff",
      "image/bmp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF or image file (JPEG, PNG, TIFF, BMP)");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setError("");
    setResult(null);
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("policy_document", file);

      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      console.log("Upload token:", token ? "Present" : "Missing");
      console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const response = await fetch(`${API_URL}/policies/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log("Upload response:", response.status, data);

      if (response.ok) {
        setResult(data);
        setEditableData({
          ...data.extracted_data,
          temp_id: data.temp_id,
        });
      } else {
        console.error("Upload failed:", data);
        setError(data.message || data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmPolicy = async () => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);

      console.log("Sending confirmation with temp_id:", editableData.temp_id);
      console.log("Corrections data:", editableData);

      const response = await fetch(`${API_URL}/policies/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          temp_id: editableData.temp_id,
          corrections: {
            policy_number: editableData.policy_number,
            policy_holder_name: editableData.policy_holder_name,
            policy_holder_email: editableData.policy_holder_email,
            policy_holder_phone: editableData.policy_holder_phone,
            policy_type: editableData.policy_type,
            coverage_amount: editableData.coverage_amount,
            premium_amount: editableData.premium_amount,
            deductible_amount: editableData.deductible_amount,
            policy_start_date: editableData.policy_start_date,
            policy_end_date: editableData.policy_end_date,
          },
        }),
      });

      const responseData = await response.json();
      console.log("Response:", responseData);

      if (response.ok) {
        alert("Policy confirmed and saved successfully!");
        setResult(null);
        setFile(null);
        setEditableData({});
        // Refresh the page to show updated lists
        window.location.reload();
      } else {
        console.error("Backend error:", responseData);
        alert(
          `Failed to confirm policy: ${
            responseData.message || responseData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error confirming policy:", error);
      alert("Error confirming policy");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Upload Policy Document</h2>

      <div
        onDrop={(e) => {
          e.preventDefault();
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) handleFileSelect(droppedFile);
        }}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          file
            ? "border-green-300 bg-green-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        {file ? (
          <div>
            <div className="text-green-600 mb-2">✓ File Selected</div>
            <div className="font-medium">{file.name}</div>
            <div className="text-sm text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <div>
            <div className="text-lg font-medium text-gray-900 mb-2">
              Drop your policy document here
            </div>
            <div className="text-gray-500 mb-4">or click to browse files</div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) handleFileSelect(selectedFile);
          }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Browse Files
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {file && !result && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={uploadFile}
            disabled={uploading}
            className={`px-6 py-2 rounded font-medium ${
              uploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {uploading ? "Processing..." : "Upload & Extract Data"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Extracted Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Policy Number
              </label>
              <input
                type="text"
                value={editableData.policy_number || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    policy_number: e.target.value,
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Policy Holder Name
              </label>
              <input
                type="text"
                value={editableData.policy_holder_name || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    policy_holder_name: e.target.value,
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Email
              </label>
              <input
                type="email"
                value={editableData.policy_holder_email || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    policy_holder_email: e.target.value,
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={editableData.policy_holder_phone || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    policy_holder_phone: e.target.value,
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Policy Type
              </label>
              <input
                type="text"
                value={editableData.policy_type || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    policy_type: e.target.value,
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Coverage Amount
              </label>
              <input
                type="number"
                value={editableData.coverage_amount || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    coverage_amount: parseFloat(e.target.value),
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Premium Amount
              </label>
              <input
                type="number"
                value={editableData.premium_amount || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    premium_amount: parseFloat(e.target.value),
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Deductible Amount
              </label>
              <input
                type="number"
                value={editableData.deductible_amount || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    deductible_amount: parseFloat(e.target.value),
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Policy Start Date
              </label>
              <input
                type="date"
                value={editableData.policy_start_date || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    policy_start_date: e.target.value,
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Policy End Date
              </label>
              <input
                type="date"
                value={editableData.policy_end_date || ""}
                onChange={(e) =>
                  setEditableData({
                    ...editableData,
                    policy_end_date: e.target.value,
                  })
                }
                className="w-full border rounded p-2"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setResult(null);
                setEditableData({});
              }}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPolicy}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Confirm & Save Policy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
