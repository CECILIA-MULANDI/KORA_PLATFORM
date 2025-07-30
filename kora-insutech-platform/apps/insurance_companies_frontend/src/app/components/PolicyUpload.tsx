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
      const response = await fetch(`${API_URL}/policies/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || "Upload failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
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
            {Object.entries(result.extracted_data).map(([key, value]) => (
              <div key={key} className="border rounded p-3">
                <div className="text-sm font-medium text-gray-600 capitalize">
                  {key.replace(/_/g, " ")}
                </div>
                <div className="mt-1">
                  {value ? (
                    String(value)
                  ) : (
                    <span className="text-gray-400 italic">Not found</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
