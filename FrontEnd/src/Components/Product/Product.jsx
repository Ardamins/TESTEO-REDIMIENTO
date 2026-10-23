import React, { useState, useContext, useEffect, useRef } from "react";
import "./Product.css";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "../DashBoardHeader/DashBoardHeader";
import CsvUploadModal from "./CsvUploadModal/CsvUploadModal";
import { AdminContext } from "../../Context/AdminContext";
import OrderProductModal from "./OrderProductModal/OrderProductModal";
import useOutsideClick from "../OutSideClick/useOutsideClick";

const Product = () => {
  const {
    products,
    fetchProducts,
    updateAvailability,
    inventoryStats,
    orderProduct,
  } = useContext(AdminContext);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showViewProductModal, setShowViewProductModal] = useState(false);
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Separate refs for different modals
  const viewProductModalRef = useRef();
  const csvUploadModalRef = useRef();
  const orderModalRef = useRef();

  const productsPerPage = 6;
  const navigate = useNavigate();

  // Close view product modal when clicking outside
  useOutsideClick(viewProductModalRef, () => {
    if (showViewProductModal) {
      setShowViewProductModal(false);
    }
  });

  // Close CSV upload modal when clicking outside
  useOutsideClick(csvUploadModalRef, () => {
    if (showCsvUploadModal) {
      setShowCsvUploadModal(false);
    }
  });

  // Close order modal when clicking outside
  useOutsideClick(orderModalRef, () => {
    if (showOrderModal) {
      setShowOrderModal(false);
      setSelectedProduct(null);
    }
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filtered products based on search
  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.productName?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower) ||
      product.availability?.toLowerCase().includes(searchLower) ||
      product.price?.toString().includes(searchTerm) ||
      product.quantity?.toString().includes(searchTerm) ||
      product.thresholdValue?.toString().includes(searchTerm)
    );
  });

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // Clamp currentPage if totalPages reduced
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages || 1);
  }, [totalPages, currentPage]);

  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleSearch = (term) => setSearchTerm(term);

  const handleUpdateAvailability = async (productId) => {
    try {
      await updateAvailability(productId);
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  };

  const formatPrice = (price) =>
    typeof price === "number" ? price : parseFloat(price) || 0;

  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case "In stock":
        return "green";
      case "Out of stock":
        return "red";
      case "Low stock":
        return "orange";
      default:
        return "black";
    }
  };

  // Modal close functions
  const closeViewProductModal = () => {
    setShowViewProductModal(false);
  };

  const closeCsvUploadModal = () => {
    setShowCsvUploadModal(false);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedProduct(null);
  };

  return (
    <div className="product-container">
      <DashboardHeader
        title="Products"
        showSearch={true}
        onSearch={handleSearch}
      />
      <hr />

      {/* Overall Inventory */}
      <div className="overall-product">
        <h2>Overall Inventory</h2>
        <div className="info">
          <div className="card">
            <h4>Categories</h4>
            <div className="info1 single">
              <p>{inventoryStats.categories || 0}</p>
              <span>Total categories</span>
            </div>
          </div>

          <div className="card">
            <h4>Total Products</h4>
            <div className="info moreInfo">
              <div className="info1">
                <p>{inventoryStats.totalProducts || 0}</p>
                <span>Total items</span>
              </div>
              <div className="info2">
                <p>₹{(inventoryStats.revenue || 0).toLocaleString()}</p>
                <span>Total Revenue</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h4>Top Selling</h4>
            <div className="info moreInfo">
              <div className="info1">
                <p>{inventoryStats.topSelling || 0}</p>
                <span>Last 7 days</span>
              </div>
              <div className="info2">
                <p>₹{(inventoryStats.topSellingCost || 0).toLocaleString()}</p>
                <span>Cost</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h4>Low Stocks</h4>
            <div className="info">
              <div className="info1">
                <p>{inventoryStats.lowStocksOrdered || 0}</p>
                <span>Low stock</span>
              </div>
              <div className="info2">
                <p>{inventoryStats.lowStocksNotInStock || 0}</p>
                <span>Out of stock</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="product-list">
        <div className="table-heading">
          <p>
            Products {searchTerm && `(Filtered: ${filteredProducts.length})`}
          </p>
          <button onClick={() => setShowViewProductModal(true)}>
            Add Product
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Products</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Threshold Value</th>
              <th>Expiry</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((product, idx) => (
              <tr
                key={product._id || idx}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedProduct(product);
                  setShowOrderModal(true);
                }}
                title="Click to order more"
              >
                <td>{product.name || product.productName}</td>
                <td>₹{formatPrice(product.price)}</td>
                <td>{product.quantity}</td>
                <td>{product.thresholdValue || product.threshold}</td>
                <td>
                  {product.expiryDate
                    ? new Date(product.expiryDate).toLocaleDateString()
                    : "N/A"}
                </td>
                <td
                  className={product.availability
                    ?.toLowerCase()
                    .replace(" ", "-")}
                  style={{
                    color: getAvailabilityColor(product.availability),
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateAvailability(product._id);
                  }}
                  title="Click to update availability"
                >
                  {product.availability}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination">
          <button onClick={handlePrevious} disabled={currentPage === 1}>
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </button>
        </div>
      </div>

      {/* VIEW PRODUCT MODAL */}
      {showViewProductModal && (
        <div className="modal-overlay" onClick={closeViewProductModal}>
          <div
            className="option-modal"
            ref={viewProductModalRef}
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
          >
            <div className="option-buttons">
              <button
                className="option-btn"
                onClick={() => {
                  setShowViewProductModal(false);
                  navigate("/product/addNewProduct");
                }}
              >
                Individual Product
              </button>
              <button
                className="option-btn"
                onClick={() => {
                  setShowViewProductModal(false);
                  setShowCsvUploadModal(true);
                }}
              >
                Multiple Product
              </button>
            </div>
            <button className="close-btn" onClick={closeViewProductModal}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* CSV UPLOAD MODAL */}
      {showCsvUploadModal && (
        <div className="modal-overlay" onClick={closeCsvUploadModal}>
          <div ref={csvUploadModalRef} onClick={(e) => e.stopPropagation()}>
            <CsvUploadModal onClose={closeCsvUploadModal} />
          </div>
        </div>
      )}

      {/* ORDER MODAL */}
      {showOrderModal && selectedProduct && (
        <div className="modal-overlay" onClick={closeOrderModal}>
          <div ref={orderModalRef} onClick={(e) => e.stopPropagation()}>
            <OrderProductModal
              product={selectedProduct}
              onClose={closeOrderModal}
              onOrder={async (product, qty) => {
                try {
                  await orderProduct(product._id, qty);
                  await fetchProducts();
                } catch (err) {
                  console.error("Error ordering product:", err);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Product;
