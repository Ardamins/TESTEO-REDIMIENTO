import axios from "axios";
import React, { createContext, useCallback, useEffect, useState } from "react";

export const AdminContext = createContext(null);

const AdminContextProvider = (props) => {
  const url = "https://inventory-management-dashboard-backend-t5lp.onrender.com";

  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem("dashboardStats");
    return saved
      ? JSON.parse(saved)
      : {
          salesOverview: { salesCount: 0, revenue: 0, profit: 0, cost: 0 },
          purchaseOverview: {
            purchaseCount: 0,
            cost: 0,
            canceledOrders: 0,
            returns: 0,
          },
          inventorySummary: { quantityInHand: 0, toBeReceived: 0 },
          productSummary: { suppliers: 0, categories: 0 },
          topProducts: [],
          chartType: "monthly",
          chartData: [],
          invoices: { total: 0, paid: 0, unpaid: 0 },
        };
  });
  const [inventoryStats, setInventoryStats] = useState(
    JSON.parse(localStorage.getItem("inventoryStats")) || {
      categories: 0,
      totalProducts: 0,
      revenue: 0,
      topSelling: 0,
      topSellingCost: 0,
      lowStocksOrdered: 0,
      lowStocksNotInStock: 0,
      lastUpdated: null,
    }
  );
  const [type, setType] = useState("monthly");
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [overallStats, setOverallStats] = useState({});
  const [overallProductStats, setOverallProductStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
  });

  const openModal = useCallback((content = null) => {
    setModalState({ isOpen: true, content });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, content: null });
  }, []);

  useEffect(() => {
    const storedAdmin = localStorage.getItem("admin");
    const storedToken = localStorage.getItem("token");
    if (storedAdmin && storedToken) {
      setAdmin(JSON.parse(storedAdmin));
      setToken(storedToken);
    }
    fetchDashboardStats(type);
    fetchInventoryStats();
    fetchInvoices();
    fetchOverallStats();
  }, []);

  const saveSession = (adminData, jwtToken) => {
    setAdmin(adminData);
    setToken(jwtToken);
    localStorage.setItem("admin", JSON.stringify(adminData));
    localStorage.setItem("token", jwtToken);
  };
  const fetchAdminByEmail = async (email) => {
    try {
      const res = await axios.get(`${url}/admin/get-admin-details/${email}`);
      if (res.data.success) {
        return res.data.admin;
      }
      return null;
    } catch (err) {
      console.error("Error fetching admin data:", err);
      return null;
    }
  };
  const loginAdmin = async (email, password) => {
    try {
      const res = await axios.post(`${url}/admin/login`, { email, password });
      if (res.data.success) {
        const adminData = await fetchAdminByEmail(email);

        if (adminData) {
          saveSession(adminData, res.data.token);
          return { success: true };
        } else {
          return {
            success: false,
            message: "Failed to fetch admin data after login",
          };
        }
      } else {
        return { success: false, message: res.data.message };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Login failed",
      };
    }
  };
  const registerAdmin = async (name, email, password) => {
    try {
      const res = await axios.post(`${url}/admin/register`, {
        name,
        email,
        password,
      });
      if (res.data.success) {
        saveSession(res.data.admin, res.data.token);
        window.alert("Register succesfull");
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Registration failed",
      };
    }
  };
  const updateProfile = async (payload) => {
    try {
      const res = await axios.put(`${url}/admin/update-profile`, payload);
      const { success, admin: updated, shouldLogout, message } = res.data || {};

      if (!success) return { success: false, message };

      if (shouldLogout) {
        logout();
        return { success: true, shouldLogout: true, message };
      }

      const merged = { ...admin, ...updated };
      setAdmin(merged);
      localStorage.setItem("admin", JSON.stringify(merged));

      return { success: true, shouldLogout: false, admin: merged, message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Update failed",
      };
    }
  };
  const sendOtp = async (email) => {
    try {
      const res = await axios.post(`${url}/admin/verify-email`, { email });
      window.alert("OTP sended succesfull");
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to send OTP",
      };
    }
  };
  const verifyOtp = async (email, otp) => {
    try {
      const res = await axios.post(`${url}/admin/verify-otp`, { email, otp });
      window.alert("Verify your otp succesfull");
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Invalid OTP",
      };
    }
  };
  const resetPassword = async (email, newPassword, confirmPassword) => {
    try {
      const res = await axios.post(`${url}/admin/reset-password`, {
        email,
        newPassword,
        confirmPassword,
      });
      window.alert("Password reset succesfull");
      return { success: true, message: res.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Reset failed",
      };
    }
  };
  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem("admin");
    localStorage.removeItem("token");
  };
  const fetchDashboardStats = async (selectedType = type) => {
    try {
      const res = await axios.get(`${url}/dashboard/stats/${selectedType}`);

      if (res.data && res.data.success && res.data.data) {
        setStats(res.data.data);
        localStorage.setItem("dashboardStats", JSON.stringify(res.data.data));
        setType(selectedType);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };
  const handleTypeChange = async (newType) => {
    if (newType !== type) {
      setType(newType);
      await fetchDashboardStats(newType);
    }
  };
  const refreshStats = () => {
    fetchDashboardStats(type);
  };
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${url}/product/get-all-products`);
      if (res.data) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.log("Error in fetchProduct:", err);
    } finally {
      setLoading(false);
    }
  };
  const addProduct = async (formData) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${url}/product/add-single-product`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data.product) {
        setProducts((prev) => [...prev, res.data.product]);
        if (res.data.invoice) {
          setInvoices((prev) => [...prev, res.data.invoice]);
        }
      }
      return res.data;
    } catch (err) {
      console.log("Error in adding a single product:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const addProductsFromCSV = async (formData) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${url}/product/add-multiple-product`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        // Update products state
        if (res.data.products) {
          setProducts((prev) => [...prev, ...res.data.products]);
        }

        // Update invoices state
        if (res.data.invoice) {
          setInvoices((prev) => [...prev, res.data.invoice]);
        }

        return res.data;
      } else {
        throw new Error(res.data.message || "Upload failed");
      }
    } catch (err) {
      console.log("Error in adding multiple products:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  const updateAvailability = async (productId) => {
    try {
      setLoading(true);
      await axios.put(
        `${url}/product/update-product-availability/${productId}`
      );
      await fetchProducts();
    } catch (err) {
      console.log("Error in update availability :", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${url}/invoice/get-all-invoices`);
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.log("Error in fetch Invoice - ", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchInvoiceById = async (invoiceId) => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${url}/invoice/get-invoice-by-Id/${invoiceId}`
      );
      if (data.success) {
        setInvoice(data.invoice);
      }
    } catch (err) {
      console.log("Error in fetch Invoice by Id-", err);
    } finally {
      setLoading(false);
    }
  };
  const payInvoice = async (invoiceId) => {
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${url}/invoice/pay-invoice/${invoiceId}`
      );
      if (data.success) {
        setInvoice(data.invoice);
        await fetchInvoices();
        await fetchOverallStats();
      }
    } catch (err) {
      console.log("Error in payInvoice - ", err);
    } finally {
      setLoading(false);
    }
  };
  const deleteInvoice = async (invoiceId) => {
    try {
      await axios.delete(`${url}/invoice/delete-invoice/${invoiceId}`);
      setInvoices((prev) => prev.filter((inv) => inv._id !== invoiceId));
      await fetchInvoices();
      await fetchOverallStats();
    } catch (err) {
      console.log("Error in delete Invoice:", err);
    }
  };
  const fetchOverallStats = async () => {
    try {
      const { data } = await axios.get(
        `${url}/overall-invoice/get-overall-invoice-stats`
      );
      if (data.success) {
        setOverallStats(data.stats);
      }
    } catch (err) {
      console.log("Error in fetchOverallStats", err);
    }
  };
  const saveStats = (stats) => {
    setInventoryStats(stats);
    localStorage.setItem("inventoryStats", JSON.stringify(stats));
  };
  const fetchInventoryStats = async () => {
    try {
      const response = await axios.get(`${url}/inventory/get-inventory-stats`);
      if (response.data && response.data.stats) {
        saveStats(response.data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch inventory stats:", error);
    }
  };
  const orderProduct = async (productId, quantity) => {
    try {
      setLoading(true);
      const { data } = await axios.post(
        `${url}/product/order-product/${productId}`,
        { quantity }
      );
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p._id === productId
              ? {
                  ...p,
                  quantity: data.product.remainingQuantity,
                  sold: data.product.sold,
                  availability: data.product.availability,
                }
              : p
          )
        );
        fetchInventoryStats();
      }
      console.log("product ordered successfully...");
      return data;
    } catch (err) {
      console.error("Error ordering product:", err);
    }
  };

  const contextValue = {
    url,
    admin,
    token,
    loginAdmin,
    registerAdmin,
    sendOtp,
    verifyOtp,
    resetPassword,
    logout,
    stats,
    type,
    setType,
    fetchDashboardStats,
    handleTypeChange,
    refreshStats,
    products,
    invoices,
    invoice,
    overallStats,
    loading,
    fetchProducts,
    addProduct,
    addProductsFromCSV,
    updateAvailability,
    fetchInvoices,
    fetchInvoiceById,
    payInvoice,
    deleteInvoice,
    fetchOverallStats,
    inventoryStats,
    orderProduct,
    updateProfile,
    modalState,
    setModalState,
    openModal,
    closeModal,
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
