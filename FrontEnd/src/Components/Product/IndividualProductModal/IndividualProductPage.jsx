import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../../DashBoardHeader/DashBoardHeader";
import "./IndividualProductPage.css";
import { assets } from "../../../assets/assets";
import { AdminContext } from "../../../Context/AdminContext";

const IndividualProductPage = () => {
  const { addProduct, refreshStats } = useContext(AdminContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    productName: "",
    productId: "",
    category: "",
    price: "",
    quantity: "",
    unit: "",
    expiryDate: "",
    thresholdValue: "",
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = [
    "Electronics",
    "Clothing",
    "Food & Beverages",
    "Books",
    "Health & Beauty",
    "Home & Garden",
    "Sports & Outdoors",
    "Toys & Games",
    "Automotive",
    "Office Supplies",
  ];

  const units = [
    "Pieces",
    "Packets",
    "Boxes",
    "Bottles",
    "Cans",
    "Kg",
    "Grams",
    "Liters",
    "ml",
    "Meters",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          image: "Please select a valid image file",
        }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          image: "Image size should be less than 5MB",
        }));
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
      };
      reader.readAsDataURL(file);

      // Clear image error
      if (errors.image) {
        setErrors((prev) => ({
          ...prev,
          image: "",
        }));
      }
    }
  };

  const handleBrowseImage = () => {
    document.getElementById("imageUpload").click();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = "Product name is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = "Valid price is required";
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = "Valid quantity is required";
    }

    if (!formData.unit.trim()) {
      newErrors.unit = "Unit is required";
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = "Expiry date is required";
    } else {
      const today = new Date();
      const expiryDate = new Date(formData.expiryDate);
      if (expiryDate <= today) {
        newErrors.expiryDate = "Expiry date must be in the future";
      }
    }

    if (!formData.thresholdValue || parseInt(formData.thresholdValue) < 0) {
      newErrors.thresholdValue = "Valid threshold value is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddProduct = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create FormData object
      const productFormData = new FormData();

      // Append form fields
      productFormData.append("productName", formData.productName);
      productFormData.append("productId", formData.productId);
      productFormData.append("category", formData.category);
      productFormData.append("price", parseFloat(formData.price));
      productFormData.append("quantity", parseInt(formData.quantity));
      productFormData.append("unit", formData.unit);
      productFormData.append("expiryDate", formData.expiryDate);
      productFormData.append(
        "thresholdValue",
        parseInt(formData.thresholdValue)
      );

      // Append image if selected
      if (imageFile) {
        productFormData.append("image", imageFile);
      }

      const result = await addProduct(productFormData);

      if (result && result.success) {
        // Refresh dashboard stats
        refreshStats();

        // Show success message
        alert("Product added successfully!");

        // Navigate back to products page
        navigate("/product");
      } else {
        throw new Error(result?.message || "Failed to add product");
      }
    } catch (error) {
      alert(error.message || "Failed to add product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard all changes?")) {
      setFormData({
        productName: "",
        productId: "",
        category: "",
        price: "",
        quantity: "",
        unit: "",
        expiryDate: "",
        thresholdValue: "",
      });
      setSelectedImage(null);
      setImageFile(null);
      setErrors({});
    }
  };

  const handleBackToProducts = () => {
    navigate("/product");
  };

  return (
    <div className="individual-product-page">
      <DashboardHeader title="Product" showSearch={false} />
      <hr />

      <div className="page-content">
        <div className="breadcrumb">
          <span
            style={{ cursor: "pointer", color: "#007bff" }}
            onClick={handleBackToProducts}
          >
            Products
          </span>
          <span className="separator">›</span>
          <span>Add Product</span>
          <span className="separator">›</span>
          <span>Individual Product</span>
        </div>

        <div className="product-form-container">
          <div className="form-header">
            <h2>New Product</h2>
          </div>

          <div className="form-content">
            {/* Left side - Image upload */}
            <div className="left-section">
              <div className="image-upload-area">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Product"
                    className="uploaded-image"
                  />
                ) : (
                  <div className="image-placeholder">
                    <div className="placeholder-content">
                      <p>Drag image here</p>
                    </div>
                  </div>
                )}
              </div>
              {errors.image && (
                <span className="error-message">{errors.image}</span>
              )}
              <p>OR</p>
              <button
                type="button"
                className="browse-btn"
                onClick={handleBrowseImage}
                disabled={loading}
              >
                Browse image
              </button>
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </div>

            <div className="right-section">
              <div className="form-grid">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="productName"
                    placeholder="Enter product name"
                    value={formData.productName}
                    onChange={handleInputChange}
                    className={errors.productName ? "error" : ""}
                  />
                  {errors.productName && (
                    <span className="error-message">{errors.productName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Product ID </label>
                  <input
                    type="text"
                    name="productId"
                    placeholder="Enter product ID"
                    value={formData.productId}
                    onChange={handleInputChange}
                    className={errors.productId ? "error" : ""}
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={errors.category ? "error" : ""}
                  >
                    <option value="">Select product category</option>
                    {categories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <span className="error-message">{errors.category}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    name="price"
                    placeholder="Enter price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={errors.price ? "error" : ""}
                  />
                  {errors.price && (
                    <span className="error-message">{errors.price}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    placeholder="Enter product quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    className={errors.quantity ? "error" : ""}
                  />
                  {errors.quantity && (
                    <span className="error-message">{errors.quantity}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Unit *</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className={errors.unit ? "error" : ""}
                  >
                    <option value="">Select unit</option>
                    {units.map((unit, index) => (
                      <option key={index} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  {errors.unit && (
                    <span className="error-message">{errors.unit}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split("T")[0]}
                    className={errors.expiryDate ? "error" : ""}
                  />
                  {errors.expiryDate && (
                    <span className="error-message">{errors.expiryDate}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Threshold Value *</label>
                  <input
                    type="number"
                    name="thresholdValue"
                    placeholder="Enter threshold value"
                    value={formData.thresholdValue}
                    onChange={handleInputChange}
                    min="0"
                    className={errors.thresholdValue ? "error" : ""}
                  />
                  {errors.thresholdValue && (
                    <span className="error-message">
                      {errors.thresholdValue}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="discard-btn"
              onClick={handleDiscard}
              disabled={loading}
            >
              Discard
            </button>
            <button
              type="button"
              className="add-product-btn"
              onClick={handleAddProduct}
              disabled={loading}
            >
              {loading ? "Adding Product..." : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualProductPage;
