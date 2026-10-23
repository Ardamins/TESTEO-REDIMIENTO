import React, {
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import "./Invoice.css";
import DashboardHeader from "../DashBoardHeader/DashBoardHeader";
import { assets } from "../../assets/assets";
import { AdminContext } from "../../Context/AdminContext";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import useOutsideClick from "../OutSideClick/useOutsideClick";

const Invoice = () => {
  const {
    invoices,
    invoice,
    overallStats,
    loading,
    fetchInvoices,
    fetchInvoiceById,
    payInvoice,
    deleteInvoice,
    fetchOverallStats,
    closeModal,
  } = useContext(AdminContext);

  // Separate refs for different modals
  const viewModalRef = useRef();
  const deleteModalRef = useRef();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showOptions, setShowOptions] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const invoicesPerPage = 6;

  // Close view modal when clicking outside
  useOutsideClick(viewModalRef, () => {
    if (showViewModal) {
      setShowViewModal(false);
      setSelectedInvoice(null);
    }
  });

  // Close delete modal when clicking outside
  useOutsideClick(deleteModalRef, () => {
    if (showDeleteModal) {
      setShowDeleteModal(false);
      setSelectedInvoice(null);
    }
  });

  useEffect(() => {
    fetchInvoices();
    fetchOverallStats();
  }, []);

  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const debouncedSetSearchQuery = useCallback(
    debounce((value) => {
      setSearchQuery(value);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300),
    []
  );

  const handleSearchChange = (value) => {
    debouncedSetSearchQuery(value);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const customerName = inv.customer?.name || "";
    const searchTerm = searchQuery.toLowerCase();

    return (
      (inv.invoiceId || "").toLowerCase().includes(searchTerm) ||
      (inv.referenceNumber || "").toLowerCase().includes(searchTerm) ||
      customerName.toLowerCase().includes(searchTerm) ||
      (inv.amount || "").toString().includes(searchTerm) ||
      (inv.status || "").toLowerCase().includes(searchTerm)
    );
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const dateA = new Date(a.invoiceDate || a.createdAt || 0);
    const dateB = new Date(b.invoiceDate || b.createdAt || 0);
    return dateB - dateA; // latest first
  });

  const indexOfLast = currentPage * invoicesPerPage;
  const indexOfFirst = indexOfLast - invoicesPerPage;
  const totalPages = Math.ceil(sortedInvoices.length / invoicesPerPage);
  const currentInvoices = sortedInvoices.slice(indexOfFirst, indexOfLast);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleView = async (invoiceData) => {
    setSelectedInvoice(invoiceData);
    setShowViewModal(true);
    setShowOptions(null);

    // Fetch detailed invoice data
    if (invoiceData._id) {
      await fetchInvoiceById(invoiceData.invoiceId);
    }
  };

  const handleDelete = (invoiceData) => {
    setSelectedInvoice(invoiceData);
    setShowDeleteModal(true);
    setShowOptions(null);
  };

  const handleMarkAsPaid = async (invoiceData) => {
    try {
      await payInvoice(invoiceData.invoiceId);
      setShowOptions(null);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      alert("Failed to update invoice status. Please try again.");
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteInvoice(selectedInvoice.invoiceId);
      setShowDeleteModal(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice. Please try again.");
    }
  };

  const formatAmount = (amount) => {
    if (typeof amount === "number") {
      return `₹${amount.toLocaleString()}`;
    }
    if (typeof amount === "string") {
      const numAmount = parseFloat(amount.replace(/[₹,]/g, ""));
      return isNaN(numAmount) ? amount : `₹${numAmount.toLocaleString()}`;
    }
    return "₹0";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      const formattedDate = new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
      return formattedDate;
    } catch {
      return date;
    }
  };

  const handleDownloadInvoice = async () => {
    const invoiceElement = document.querySelector(".invoice-modal");
    if (!invoiceElement) return;

    try {
      const canvas = await html2canvas(invoiceElement, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${selectedInvoice.invoiceId || "0000"}.pdf`);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Failed to download invoice. Please try again.");
    }
  };

  const handlePrintInvoice = () => {
    const printContent = document.querySelector(".invoice-modal");
    if (!printContent) return;

    const newWindow = window.open("", "_blank");
    newWindow.document.write(`<html><head><title>Invoice</title></head><body>`);
    newWindow.document.write(printContent.outerHTML);
    newWindow.document.write(`</body></html>`);
    newWindow.document.close();
    newWindow.focus();
    newWindow.print();
    newWindow.close();
  };

  // Close view modal function
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedInvoice(null);
  };

  // Close delete modal function
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedInvoice(null);
  };

  return (
    <div className="invoice-container">
      <DashboardHeader
        title="Invoice"
        showSearch={true}
        onSearch={handleSearchChange}
        searchPlaceholder="Search invoices by ID, reference, customer, amount or status"
      />
      <hr />

      <div className="overall-invoice">
        <h2>Overall Invoice</h2>
        <div className="info">
          <div className="card">
            <h4>Recent Transactions</h4>
            <div className="info">
              <div className="info1">
                <p>{overallStats.recentTransactions || 0}</p>
                <span>Last 7 days</span>
              </div>
            </div>
          </div>
          <div className="card">
            <h4>Total Invoices</h4>
            <div className="info">
              <div className="info1">
                <p>{overallStats.totalInvoices || 0}</p>
                <span>Total invoices</span>
              </div>
              <div className="info2">
                <p>{overallStats.processedInvoices || 0}</p>
                <span>Processed</span>
              </div>
            </div>
          </div>
          <div className="card">
            <h4>Paid Amount</h4>
            <div className="info">
              <div className="info1">
                <p>{formatAmount(overallStats.paidAmount || 0)}</p>
                <span>Total paid</span>
              </div>
              <div className="info2">
                <p>{overallStats.processedInvoices || 0}</p>
                <span>Paid invoices</span>
              </div>
            </div>
          </div>
          <div className="card">
            <h4>Unpaid Amount</h4>
            <div className="info">
              <div className="info1">
                <p>{formatAmount(overallStats.unpaidAmount || 0)}</p>
                <span>Outstanding</span>
              </div>
              <div className="info2">
                <p>{overallStats.pendingPayments || 0}</p>
                <span>Pending Payment</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="invoice-list">
        <div className="table-heading">
          <p>Invoice List</p>
          {searchQuery && (
            <span className="search-results-info">
              {filteredInvoices.length} invoice(s) found for "{searchQuery}"
            </span>
          )}
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Reference Number</th>
                <th>Customer</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Due Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentInvoices.length > 0 ? (
                currentInvoices.map((invoiceData, idx) => (
                  <tr key={invoiceData._id || idx}>
                    <td>{invoiceData.invoiceId || "N/A"}</td>
                    <td>{invoiceData.referenceNumber || "N/A"}</td>
                    <td>{invoiceData.customer?.name || "N/A"}</td>
                    <td>{formatAmount(invoiceData.amount)}</td>
                    <td className={invoiceData.status?.toLowerCase()}>
                      {invoiceData.status}
                    </td>
                    <td>{formatDate(invoiceData.dueDate)}</td>
                    <td className="action-cell">
                      <button
                        className="dots-btn"
                        onClick={() =>
                          setShowOptions(showOptions === idx ? null : idx)
                        }
                      >
                        ⋮
                      </button>
                      {showOptions === idx && (
                        <div className="options-popup">
                          {(invoiceData.status === "Unpaid" ||
                            invoiceData.status === "unpaid") && (
                            <button
                              onClick={() => handleMarkAsPaid(invoiceData)}
                            >
                              <span
                                style={{ backgroundColor: "green", padding: 2 }}
                              >
                                ✓
                              </span>{" "}
                              Pay
                            </button>
                          )}
                          <button onClick={() => handleView(invoiceData)}>
                            <span style={{ backgroundColor: "LightBlue" }}>
                              👁
                            </span>{" "}
                            View Invoice
                          </button>
                          <button onClick={() => handleDelete(invoiceData)}>
                            <span
                              style={{ backgroundColor: "red", padding: 2 }}
                            >
                              🗑
                            </span>{" "}
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-results">
                    {searchQuery
                      ? `No invoices found matching "${searchQuery}"`
                      : "No invoices available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filteredInvoices.length > 0 && (
            <div className="pagination">
              <button onClick={handlePrevious} disabled={currentPage === 1}>
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedInvoice && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div
            className="invoice-modal-container"
            ref={viewModalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-actions-floating">
              <button className="action-btn close" onClick={closeViewModal}>
                <img src={assets.ross} alt="Close" />
              </button>
              <button
                className="action-btn download"
                onClick={handleDownloadInvoice}
              >
                <img src={assets.down} alt="Download" />
              </button>
              <button className="action-btn print" onClick={handlePrintInvoice}>
                <img src={assets.print} alt="Print" />
              </button>
            </div>

            <div className="invoice-modal">
              <h1 className="invoice-title">INVOICE</h1>

              <div className="invoice-header">
                <div className="billed-to">
                  <p className="section-title">Billed to</p>
                  <p>{selectedInvoice.customer?.name || "Company Name"}</p>
                  <p>
                    {selectedInvoice.customer?.address || "Company address"}
                  </p>
                  <p>
                    {selectedInvoice.customer?.city || "City, Country - 00000"}
                  </p>
                </div>
                <div className="business-info">
                  <p>Business address</p>
                  <p>City, State, IN - 000 000</p>
                  <p>TAX ID 00XXXXX1234XXXX</p>
                </div>
              </div>

              <div className="invoice_data">
                {/* Invoice Details */}
                <div className="invoice-details">
                  <div>
                    <p>Invoice #</p>
                    <p>
                      {selectedInvoice.invoiceId ||
                        selectedInvoice._id?.substring(18)}
                    </p>
                  </div>
                  <div>
                    <p>Invoice date</p>
                    <p>{formatDate(selectedInvoice.invoiceDate)}</p>
                  </div>
                  <div>
                    <p>Reference</p>
                    <p>{selectedInvoice.referenceNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p>Due date</p>
                    <p>{formatDate(selectedInvoice.dueDate)}</p>
                  </div>
                </div>

                {/* Invoice Items Table */}
                <table className="invoice-table" style={{ fontSize: "14px" }}>
                  <thead>
                    <tr>
                      <th>Products</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.products &&
                    selectedInvoice.products.length > 0 ? (
                      selectedInvoice.products.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productName || "Product"}</td>
                          <td>{item.quantity || 1}</td>
                          <td>{formatAmount(item.price || 0)}</td>
                        </tr>
                      ))
                    ) : (
                      // Fallback dummy data if no items available
                      <>
                        <tr>
                          <td>Product A</td>
                          <td>2</td>
                          <td>₹500</td>
                        </tr>
                        <tr>
                          <td>Product B</td>
                          <td>1</td>
                          <td>₹850</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan="2"
                        style={{ textAlign: "left", borderRight: "none" }}
                      >
                        Subtotal
                      </td>
                      <td style={{ borderLeft: "none", textAlign: "Right" }}>
                        {formatAmount(selectedInvoice.amount)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan="2"
                        style={{ textAlign: "left", borderRight: "none" }}
                      >
                        Tax (0%)
                      </td>
                      <td style={{ borderLeft: "none", textAlign: "Right" }}>
                        {formatAmount(0)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan="2"
                        style={{
                          textAlign: "left",
                          fontWeight: "bold",
                          color: "#008080",
                          borderRight: "none",
                        }}
                      >
                        Total due
                      </td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: "#008080",
                          borderLeft: "none",
                          textAlign: "Right",
                        }}
                      >
                        {formatAmount(selectedInvoice.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Note */}
              <p className="invoice-note" style={{ textAlign: "center" }}>
                Please pay within 15 days of receiving this invoice.
              </p>

              {/* Footer */}
              <div className="invoice-footer">
                <p>www.recehotl.inc</p>
                <p>+91 00000 00000</p>
                <p>hello@email.com</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div
            className="modal"
            ref={deleteModalRef}
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
          >
            <p>This invoice will be deleted.</p>
            <div className="modal-actions">
              <button
                onClick={closeDeleteModal}
                style={{ border: "none", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmDelete}>
                {loading ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
