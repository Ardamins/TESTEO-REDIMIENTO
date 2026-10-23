import React, { useState, useRef, useContext } from "react";
import "./CsvUploadModal.css";
import { AdminContext } from "../../../Context/AdminContext";

const CsvUploadModal = ({ onClose }) => {
  const { addProductsFromCSV, refreshStats } = useContext(AdminContext);

  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentStep, setCurrentStep] = useState("upload"); // "upload", "verifying", "preview"
  const [csvData, setCsvData] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const expectedHeaders = [
    "productName",
    "category",
    "price",
    "quantity",
    "unit",
    "expiryDate",
    "thresholdValue",
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setUploadedFile(file);
        setUploadError("");
      } else {
        setUploadError("Please upload a CSV file only");
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setUploadedFile(file);
        setUploadError("");
      } else {
        setUploadError("Please upload a CSV file only");
      }
    }
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setCsvData([]);
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateCSVHeaders = (headers) => {
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
    const normalizedExpected = expectedHeaders.map((h) => h.toLowerCase());

    const missingHeaders = normalizedExpected.filter(
      (expected) => !normalizedHeaders.some((header) => header === expected)
    );

    return {
      isValid: missingHeaders.length === 0,
      missingHeaders: missingHeaders,
    };
  };

  const validateCSVData = (data) => {
    const errors = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2;

      if (!row.productName?.trim()) {
        errors.push(`Row ${rowNumber}: Product name is required`);
      }

      // ✅ Removed productId validation (auto-generated)

      if (!row.category?.trim()) {
        errors.push(`Row ${rowNumber}: Category is required`);
      }

      if (
        !row.price ||
        isNaN(parseFloat(row.price)) ||
        parseFloat(row.price) <= 0
      ) {
        errors.push(`Row ${rowNumber}: Valid price is required`);
      }

      if (
        !row.quantity ||
        isNaN(parseInt(row.quantity)) ||
        parseInt(row.quantity) <= 0
      ) {
        errors.push(`Row ${rowNumber}: Valid quantity is required`);
      }

      if (!row.unit?.trim()) {
        errors.push(`Row ${rowNumber}: Unit is required`);
      }

      if (!row.expiryDate) {
        errors.push(`Row ${rowNumber}: Expiry date is required`);
      } else {
        const expiryDate = new Date(row.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          errors.push(`Row ${rowNumber}: Invalid expiry date format`);
        } else if (expiryDate <= new Date()) {
          errors.push(`Row ${rowNumber}: Expiry date must be in the future`);
        }
      }

      if (
        row.thresholdValue &&
        (isNaN(parseInt(row.thresholdValue)) ||
          parseInt(row.thresholdValue) < 0)
      ) {
        errors.push(`Row ${rowNumber}: Invalid threshold value`);
      }
    });

    return errors;
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          setUploadError(
            "CSV file must contain at least a header row and one data row"
          );
          setCurrentStep("upload");
          setIsVerifying(false);
          return;
        }

        const headers = lines[0].split(",").map((header) => header.trim());

        const headerValidation = validateCSVHeaders(headers);
        if (!headerValidation.isValid) {
          setUploadError(
            `Missing required headers: ${headerValidation.missingHeaders.join(", ")}`
          );
          setCurrentStep("upload");
          setIsVerifying(false);
          return;
        }

        const data = [];

        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(",").map((value) => value.trim());
            const row = {};
            headers.forEach((header, index) => {
              const normalizedHeader = header.toLowerCase().trim();
              const mappedHeader = expectedHeaders.find(
                (expected) => expected.toLowerCase() === normalizedHeader
              );

              if (mappedHeader) {
                row[mappedHeader] = values[index] || "";
              }
            });

            if (Object.keys(row).length > 0) {
              data.push(row);
            }
          }
        }

        const dataErrors = validateCSVData(data);
        if (dataErrors.length > 0) {
          setUploadError(
            `Data validation errors:\n${dataErrors.slice(0, 5).join("\n")}${dataErrors.length > 5 ? `\n... and ${dataErrors.length - 5} more errors` : ""}`
          );
          setCurrentStep("upload");
          setIsVerifying(false);
          return;
        }

        setCsvData(data);
        setCurrentStep("preview");
        setIsVerifying(false);
        setUploadError("");
      } catch (error) {
        console.error("Error parsing CSV:", error);
        setUploadError("Error parsing CSV file. Please check the file format.");
        setCurrentStep("upload");
        setIsVerifying(false);
      }
    };

    reader.onerror = () => {
      setUploadError("Error reading file. Please try again.");
      setCurrentStep("upload");
      setIsVerifying(false);
    };

    reader.readAsText(file);
  };

  const handleNext = () => {
    if (uploadedFile && currentStep === "upload") {
      setCurrentStep("verifying");
      setIsVerifying(true);
      setUploadError("");

      setTimeout(() => {
        parseCSV(uploadedFile);
      }, 2000);
    }
  };

  const handleFinalUpload = async () => {
    if (csvData.length === 0) {
      setUploadError("No valid data to upload");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("csvFile", uploadedFile);

      const result = await addProductsFromCSV(formData);

      if (result && result.success) {
        refreshStats();
        alert(`Successfully added ${result.products.length} products!`);
        onClose();
      } else {
        throw new Error(result?.message || "Failed to upload CSV");
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
      setUploadError(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload CSV. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackToUpload = () => {
    setCurrentStep("upload");
    setUploadedFile(null);
    setCsvData([]);
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const headers = expectedHeaders.join(",");
    const sampleRow =
      "Sample Product,Electronics,299.99,50,Pieces,2025-12-31,10"; // ✅ Removed productId
    const csvContent = headers + "\n" + sampleRow;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product_template.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="csv-modal-overlay">
      <div className="csv-modal">
        <div className="csv-modal-header">
          <h3>CSV Upload</h3>
          <button className="csv-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="csv-modal-content">
          {currentStep === "upload" && (
            <>
              <div style={{ marginBottom: "15px" }}>
                <p className="csv-description">
                  Add your products CSV file here
                </p>
                <button
                  className="download-template-btn"
                  onClick={downloadTemplate}
                  style={{
                    background: "none",
                    border: "1px solid #007bff",
                    color: "#007bff",
                    padding: "5px 10px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Download CSV Template
                </button>
              </div>

              {uploadError && (
                <div
                  className="error-message"
                  style={{
                    color: "red",
                    backgroundColor: "#fee",
                    padding: "10px",
                    borderRadius: "4px",
                    marginBottom: "15px",
                    whiteSpace: "pre-line",
                  }}
                >
                  {uploadError}
                </div>
              )}

              <div
                className={`csv-upload-area ${dragActive ? "drag-active" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!uploadedFile ? (
                  <>
                    <div className="csv-upload-icon">📁</div>
                    <p className="csv-upload-text">
                      Drag your CSV file here to start uploading
                    </p>
                    <button
                      className="csv-browse-btn"
                      onClick={handleBrowseFiles}
                    >
                      Browse files
                    </button>
                  </>
                ) : (
                  <div className="csv-file-preview">
                    <div className="csv-file-info">
                      <span className="csv-file-icon">📄</span>
                      <div className="csv-file-details">
                        <p className="csv-file-name">{uploadedFile.name}</p>
                        <p className="csv-file-size">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        className="csv-remove-btn"
                        onClick={handleRemoveFile}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{ marginTop: "15px", fontSize: "12px", color: "#666" }}
              >
                <p>
                  <strong>Required CSV Headers:</strong>
                </p>
                <p>{expectedHeaders.join(", ")}</p>
              </div>
            </>
          )}

          {currentStep === "verifying" && (
            <div className="csv-verification">
              <div className="verification-content">
                <div className="verification-spinner">
                  <div className="spinner"></div>
                </div>
                <p className="verification-text">Verifying your CSV file...</p>
                <p className="verification-subtext">
                  Please wait while we validate your data
                </p>
              </div>
            </div>
          )}

          {currentStep === "preview" && csvData.length > 0 && (
            <div className="csv-preview">
              <p className="csv-description">Preview of uploaded CSV data:</p>
              <div className="csv-table-container">
                <table className="csv-preview-table">
                  <thead>
                    <tr>
                      {expectedHeaders.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        {expectedHeaders.map((header, cellIndex) => (
                          <td key={cellIndex}>{row[header] || "N/A"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 5 && (
                <p className="csv-preview-note">
                  Showing first 5 rows of {csvData.length} total rows
                </p>
              )}
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".csv"
            style={{ display: "none" }}
          />
        </div>

        <div className="csv-modal-actions">
          {currentStep === "upload" && (
            <>
              <button className="csv-cancel-btn" onClick={onClose}>
                Cancel
              </button>
              {uploadedFile ? (
                <button
                  className="csv-next-btn"
                  onClick={handleNext}
                  disabled={!!uploadError}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="csv-upload-btn"
                  disabled
                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                >
                  Select File First
                </button>
              )}
            </>
          )}

          {currentStep === "verifying" && (
            <button className="csv-cancel-btn" onClick={onClose}>
              Cancel
            </button>
          )}

          {currentStep === "preview" && (
            <>
              <button className="csv-cancel-btn" onClick={handleBackToUpload}>
                Back
              </button>
              <button
                className="csv-upload-btn"
                onClick={handleFinalUpload}
                disabled={isUploading}
              >
                {isUploading
                  ? "Uploading..."
                  : `Upload ${csvData.length} Products`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvUploadModal;
