import InvoiceModel from "../models/InvoiceModel.js";
import OverAllInvoiceModel from "../models/OverallInvoice.js";
import ProductModel from "../models/ProductModel.js";

const updateOverallStats = async () => {
  const totalInvoices = await InvoiceModel.countDocuments();
  const processedInvoices = await InvoiceModel.countDocuments({
    status: "Paid",
  });
  const unpaidInvoices = await InvoiceModel.countDocuments({
    status: "Unpaid",
  });

  const paidAmountAgg = await InvoiceModel.aggregate([
    { $match: { status: "Paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const unpaidAmountAgg = await InvoiceModel.aggregate([
    { $match: { status: "Unpaid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const paidAmount = paidAmountAgg[0]?.total || 0;
  const unpaidAmount = unpaidAmountAgg[0]?.total || 0;

  const customers = await InvoiceModel.distinct("customerId");

  await OverAllInvoiceModel.findOneAndUpdate(
    {},
    {
      totalInvoices,
      processedInvoices,
      unpaidAmount,
      paidAmount,
      customers: customers.length,
      pendingPayments: unpaidInvoices,
      lastUpdated: Date.now(),
    },
    { upsert: true, new: true }
  );
};

const payInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await InvoiceModel.findOne({ invoiceId });
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    if (invoice.status === "Paid") {
      return res
        .status(400)
        .json({ success: false, message: "Invoice is already paid" });
    }

    const referenceNumber = `REF-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    invoice.status = "Paid";
    invoice.referenceNumber = referenceNumber;

    await invoice.save();

    // ✅ Increment recentTransactions count
    await OverAllInvoiceModel.findOneAndUpdate(
      {},
      { $inc: { recentTransactions: 1 } },
      { upsert: true }
    );

    // ✅ Recalculate other stats
    await updateOverallStats();

    res.status(200).json({
      success: true,
      message: "Invoice marked as paid successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const deletedInvoice = await InvoiceModel.findOneAndDelete({ invoiceId });

    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    await updateOverallStats();

    res.status(200).json({
      message: "Invoice deleted successfully",
      deletedInvoice,
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getOverallStats = async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);

    // Current 7 days stats
    const currentAgg = await InvoiceModel.aggregate([
      {
        $match: {
          status: "Paid",
          createdAt: { $gte: sevenDaysAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalProductsSold: { $sum: "$totalQuantity" },
        },
      },
    ]);

    const currentRevenue =
      currentAgg.length > 0 ? currentAgg[0].totalRevenue : 0;
    const currentProductsSold =
      currentAgg.length > 0 ? currentAgg[0].totalProductsSold : 0;

    // Previous 7 days stats
    const prevAgg = await InvoiceModel.aggregate([
      {
        $match: {
          status: "Paid",
          createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalProductsSold: { $sum: "$totalQuantity" },
        },
      },
    ]);

    const prevRevenue = prevAgg.length > 0 ? prevAgg[0].totalRevenue : 0;
    const prevProductsSold =
      prevAgg.length > 0 ? prevAgg[0].totalProductsSold : 0;

    // Stock (current)
    const stockAgg = await ProductModel.aggregate([
      { $group: { _id: null, totalStock: { $sum: "$quantity" } } },
    ]);
    const productsInStock = stockAgg.length > 0 ? stockAgg[0].totalStock : 0;

    // --- Stock change estimation ---
    // Add back what was sold last 7 days
    const soldLast7DaysAgg = await InvoiceModel.aggregate([
      {
        $match: {
          status: "Paid",
          createdAt: { $gte: sevenDaysAgo, $lte: today },
        },
      },
      { $group: { _id: null, totalSold: { $sum: "$totalQuantity" } } },
    ]);
    const soldLast7Days =
      soldLast7DaysAgg.length > 0 ? soldLast7DaysAgg[0].totalSold : 0;

    // If you have purchases/restocks model
    let purchasedLast7Days = 0;
    if (typeof PurchaseModel !== "undefined") {
      const purchasedLast7DaysAgg = await PurchaseModel.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo, $lte: today } } },
        { $group: { _id: null, totalPurchased: { $sum: "$totalQuantity" } } },
      ]);
      purchasedLast7Days =
        purchasedLast7DaysAgg.length > 0
          ? purchasedLast7DaysAgg[0].totalPurchased
          : 0;
    }

    // Approximate stock 7 days ago
    const prevProductsInStock =
      productsInStock + soldLast7Days - purchasedLast7Days;

    // Helper
    const getPercentChange = (current, prev) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return (((current - prev) / prev) * 100).toFixed(2);
    };

    const revenueChange = getPercentChange(currentRevenue, prevRevenue);
    const soldChange = getPercentChange(currentProductsSold, prevProductsSold);
    const stockChange = getPercentChange(productsInStock, prevProductsInStock);

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: { value: currentRevenue, change: revenueChange },
        totalProductsSold: { value: currentProductsSold, change: soldChange },
        productsInStock: { value: productsInStock, change: stockChange },
      },
    });
  } catch (error) {
    console.error("Error calculating overall stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

const getAllInvoices = async (req, res) => {
  try {
    const invoices = await InvoiceModel.find();

    if (!invoices || invoices.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No invoices found" });
    }

    res.status(200).json({
      success: true,
      message: "Invoices retrieved successfully",
      invoices,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await InvoiceModel.findOne({ invoiceId });
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    res.status(200).json({
      success: true,
      message: "Invoice retrieved successfully",
      invoice,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export {
  payInvoice,
  deleteInvoice,
  updateOverallStats,
  getOverallStats,
  getAllInvoices,
  getInvoiceById,
};
