import ProductModel from "../models/ProductModel.js";
import InvoiceModel from "../models/InvoiceModel.js";

const getMonthlyStats = (invoices, products) => {
  const months = Array(12)
    .fill()
    .map((_, i) => ({ period: i + 1, sales: 0, purchase: 0 }));

  // Sales from invoices
  invoices.forEach((invoice) => {
    if (invoice.status === "Paid" && invoice.invoiceDate) {
      const monthIndex = new Date(invoice.invoiceDate).getMonth();
      months[monthIndex].sales += invoice.amount || 0;
    }
  });

  // Purchases (estimated from sold units only)
  products.forEach((product) => {
    if (product.createdAt) {
      const monthIndex = new Date(product.createdAt).getMonth();
      const purchasedValue = (product.sold || 0) * (product.price || 0);
      months[monthIndex].purchase += purchasedValue;
    }
  });

  return months;
};

const getYearlyStats = (invoices, products) => {
  const currentYear = new Date().getFullYear();
  const yearRangeStart = currentYear - 2; // Last 2 years + current
  const yearRangeEnd = currentYear + 2; // Up to next 2 years

  const yearlyStats = {};

  for (let year = yearRangeStart; year <= yearRangeEnd; year++) {
    yearlyStats[year] = { sales: 0, purchase: 0 };
  }

  invoices.forEach((invoice) => {
    if (invoice.status === "Paid" && invoice.invoiceDate) {
      const year = new Date(invoice.invoiceDate).getFullYear();
      if (year >= yearRangeStart && year <= yearRangeEnd) {
        yearlyStats[year].sales += invoice.amount || 0;
      }
    }
  });

  products.forEach((product) => {
    if (product.createdAt) {
      const year = new Date(product.createdAt).getFullYear();
      if (year >= yearRangeStart && year <= yearRangeEnd) {
        const purchasedValue = (product.sold || 0) * (product.price || 0);
        yearlyStats[year].purchase += purchasedValue;
      }
    }
  });

  return Object.entries(yearlyStats)
    .map(([year, values]) => ({
      period: parseInt(year, 10),
      sales: values.sales,
      purchase: values.purchase,
    }))
    .sort((a, b) => a.period - b.period);
};

const getDashboardStats = async (req, res) => {
  try {
    const { type: paramType } = req.params;
    const { type: queryType } = req.query;
    const type = paramType || queryType || "monthly";

    const products = await ProductModel.find();
    const invoices = await InvoiceModel.find();
    const paidInvoices = invoices.filter((inv) => inv.status === "Paid");

    // Unpaid invoices = products ordered but not yet received
    const unpaidInvoices = invoices.filter((inv) => inv.status === "Unpaid");

    const toBeReceived = unpaidInvoices.reduce(
      (acc, inv) =>
        acc +
        (inv.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0),
      0
    );

    // Sales Overview
    const salesCount = paidInvoices.reduce(
      (acc, inv) =>
        acc +
        (inv.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0),
      0
    );

    const revenue = paidInvoices.reduce(
      (acc, inv) => acc + (inv.amount || 0),
      0
    );

    // Cost & Purchase Overview (only for sold units)
    let totalSoldQuantity = 0;
    let totalCost = 0;
    let purchaseCount = 0;

    products.forEach((product) => {
      const soldQuantity = product.sold || 0;
      totalSoldQuantity += soldQuantity;

      const productCost = soldQuantity * (product.price || 0);
      totalCost += productCost;

      if (soldQuantity > 0) {
        purchaseCount++;
      }
    });

    const canceledOrders = 0;
    const returns = 0;
    const profit = revenue - totalCost;

    // Inventory Summary
    const quantityInHand = products.reduce(
      (acc, p) => acc + (p.quantity || 0),
      0
    );

    const categories = new Set(products.map((p) => p.category)).size;
    const customers = invoices.map((inv) => inv.customer?.name).filter(Boolean);
    const suppliers = new Set(customers).size;

    // Top Products
    const topProducts = products
      .filter((product) => product.sold > 0)
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 5)
      .map((product) => ({
        name: product.productName,
        sold: product.sold || 0,
        imageUrl: product.imageUrl || "",
      }));

    const chartData =
      type === "yearly"
        ? getYearlyStats(invoices, products)
        : getMonthlyStats(invoices, products);

    res.status(200).json({
      success: true,
      data: {
        salesOverview: {
          salesCount,
          revenue,
          profit,
          cost: totalCost,
        },
        purchaseOverview: {
          purchaseCount,
          canceledOrders,
          returns,
          cost: totalCost,
        },
        inventorySummary: {
          quantityInHand,
          toBeReceived,
        },
        productSummary: {
          suppliers,
          categories,
        },
        topProducts,
        chartType: type,
        chartData,
        invoices: {
          total: invoices.length,
          paid: paidInvoices.length,
          unpaid: invoices.length - paidInvoices.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getDashboardStats };
