// BackEnd/controllers/DashboardController.js
import { pool } from '../config/db.js';

/* =============================================================
   Helpers de series temporales (mismo contrato de salida
   que la versión Mongoose)
   ============================================================= */

function getMonthlyStats(paidInvoices, products) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    period: i + 1,
    sales: 0,
    purchase: 0,
  }));

  paidInvoices.forEach((invoice) => {
    if (invoice.invoice_date) {
      const idx = new Date(invoice.invoice_date).getMonth();
      months[idx].sales += Number(invoice.amount || 0);
    }
  });

  products.forEach((product) => {
    if (product.created_at) {
      const idx = new Date(product.created_at).getMonth();
      const purchasedValue =
        Number(product.sold || 0) * Number(product.price || 0);
      months[idx].purchase += purchasedValue;
    }
  });

  return months;
}

function getYearlyStats(paidInvoices, products) {
  const currentYear = new Date().getFullYear();
  const start = currentYear - 2;
  const end = currentYear + 2;

  const yearlyStats = {};
  for (let y = start; y <= end; y++) {
    yearlyStats[y] = { sales: 0, purchase: 0 };
  }

  paidInvoices.forEach((invoice) => {
    if (invoice.invoice_date) {
      const y = new Date(invoice.invoice_date).getFullYear();
      if (y >= start && y <= end) {
        yearlyStats[y].sales += Number(invoice.amount || 0);
      }
    }
  });

  products.forEach((product) => {
    if (product.created_at) {
      const y = new Date(product.created_at).getFullYear();
      if (y >= start && y <= end) {
        const purchasedValue =
          Number(product.sold || 0) * Number(product.price || 0);
        yearlyStats[y].purchase += purchasedValue;
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
}

/* =============================================================
   GET /api/dashboard/stats/:type  (monthly | yearly)
   ============================================================= */
export async function getDashboardStats(req, res) {
  try {
    const { type: paramType } = req.params;
    const { type: queryType } = req.query;
    const type = paramType || queryType || 'monthly';

    /* --- Productos --- */
    const [products] = await pool.query(
      `SELECT id, name, price, stock, sold, category, image,
              created_at
       FROM products`
    );

    /* --- Invoices (cabecera) --- */
    const [invoices] = await pool.query(
      `SELECT id, amount, status, invoice_date, customer_name
       FROM invoices`
    );

    /* --- Detalle de invoices (para contar unidades) --- */
    const [invoiceItems] = await pool.query(
      `SELECT invoice_id, quantity FROM invoice_items`
    );

    /* Agrupamos cantidades por invoice_id */
    const itemsByInvoice = invoiceItems.reduce((acc, row) => {
      const key = row.invoice_id;
      acc[key] = (acc[key] || 0) + Number(row.quantity || 0);
      return acc;
    }, {});

    const paidInvoices = invoices.filter((i) => i.status === 'Paid');
    const unpaidInvoices = invoices.filter((i) => i.status === 'Unpaid');

    /* ---- Sales / Revenue ---- */
    const salesCount = paidInvoices.reduce(
      (acc, inv) => acc + (itemsByInvoice[inv.id] || 0),
      0
    );

    const revenue = paidInvoices.reduce(
      (acc, inv) => acc + Number(inv.amount || 0),
      0
    );

    /* ---- Coste de unidades vendidas ---- */
    let totalSoldQuantity = 0;
    let totalCost = 0;
    let purchaseCount = 0;

    products.forEach((p) => {
      const sold = Number(p.sold || 0);
      const price = Number(p.price || 0);

      totalSoldQuantity += sold;
      totalCost += sold * price;

      if (sold > 0) purchaseCount++;
    });

    /* ---- Pendiente de recibir (invoices Unpaid) ---- */
    const toBeReceived = unpaidInvoices.reduce(
      (acc, inv) => acc + (itemsByInvoice[inv.id] || 0),
      0
    );

    const canceledOrders = 0;
    const returns = 0;
    const profit = revenue - totalCost;

    /* ---- Inventario ---- */
    const quantityInHand = products.reduce(
      (acc, p) => acc + Number(p.stock || 0),
      0
    );

    const categories = new Set(
      products.map((p) => p.category).filter(Boolean)
    ).size;

    const supplierNames = new Set(
      invoices.map((i) => i.customer_name).filter(Boolean)
    );
    const suppliers = supplierNames.size;

    /* ---- Top 5 productos vendidos ---- */
    const topProducts = products
      .filter((p) => Number(p.sold || 0) > 0)
      .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0))
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        sold: Number(p.sold || 0),
        imageUrl: p.image || '',
      }));

    /* ---- Series temporales ---- */
    const chartData =
      type === 'yearly'
        ? getYearlyStats(paidInvoices, products)
        : getMonthlyStats(paidInvoices, products);

    /* ---- Respuesta ---- */
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
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}