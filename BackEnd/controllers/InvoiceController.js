// BackEnd/controllers/InvoiceController.js
import { pool } from '../config/db.js';

/* =============================================================
   Helper: recalcula y guarda las estadísticas globales de facturas
   en la tabla `overall_invoice_stats` (fila singleton id = 1).
   No expone req/res: se usa también desde `payInvoice`,
   `deleteInvoice` y desde `OverallInvoiceController`.
   ============================================================= */
export async function updateOverallStats() {
  const [[totals]] = await pool.query(
    `SELECT
       COUNT(*) AS totalInvoices,
       SUM(status = 'Paid')   AS processedInvoices,
       SUM(status = 'Unpaid') AS unpaidInvoices,
       COALESCE(SUM(CASE WHEN status = 'Paid'   THEN amount ELSE 0 END), 0) AS paidAmount,
       COALESCE(SUM(CASE WHEN status = 'Unpaid' THEN amount ELSE 0 END), 0) AS unpaidAmount,
       COUNT(DISTINCT customer_email) AS customers
     FROM invoices`
  );

  await pool.query(
    `INSERT INTO overall_invoice_stats
       (id, total_invoices, processed_invoices, unpaid_invoices,
        paid_amount, unpaid_amount, customers, pending_payments,
        last_updated)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       total_invoices    = VALUES(total_invoices),
       processed_invoices = VALUES(processed_invoices),
       unpaid_invoices   = VALUES(unpaid_invoices),
       paid_amount       = VALUES(paid_amount),
       unpaid_amount     = VALUES(unpaid_amount),
       customers         = VALUES(customers),
       pending_payments  = VALUES(pending_payments),
       last_updated      = NOW()`,
    [
      totals.totalInvoices || 0,
      totals.processedInvoices || 0,
      totals.unpaidInvoices || 0,
      Number(totals.paidAmount || 0),
      Number(totals.unpaidAmount || 0),
      totals.customers || 0,
      totals.unpaidInvoices || 0,
    ]
  );
}

/* =============================================================
   PUT /api/invoices/pay-invoice/:invoiceId
   ============================================================= */
export async function payInvoice(req, res) {
  try {
    const { invoiceId } = req.params;

    const [rows] = await pool.query(
      'SELECT id, status FROM invoices WHERE id = ? LIMIT 1',
      [invoiceId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Invoice not found' });
    }

    if (rows[0].status === 'Paid') {
      return res
        .status(400)
        .json({ success: false, message: 'Invoice is already paid' });
    }

    const referenceNumber = `REF-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    await pool.query(
      `UPDATE invoices
       SET status = 'Paid',
           reference_number = ?,
           paid_at = NOW()
       WHERE id = ?`,
      [referenceNumber, invoiceId]
    );

    /* Increment recentTransactions */
    await pool.query(
      `INSERT INTO overall_invoice_stats (id, recent_transactions)
       VALUES (1, 1)
       ON DUPLICATE KEY UPDATE recent_transactions = recent_transactions + 1`
    );

    await updateOverallStats();

    const [[updated]] = await pool.query(
      'SELECT * FROM invoices WHERE id = ? LIMIT 1',
      [invoiceId]
    );

    res.status(200).json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/* =============================================================
   DELETE /api/invoices/delete-invoice/:invoiceId
   ============================================================= */
export async function deleteInvoice(req, res) {
  try {
    const { invoiceId } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM invoices WHERE id = ? LIMIT 1',
      [invoiceId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await pool.query('DELETE FROM invoice_items WHERE invoice_id = ?', [
      invoiceId,
    ]);
    await pool.query('DELETE FROM invoices WHERE id = ?', [invoiceId]);

    await updateOverallStats();

    res.status(200).json({
      message: 'Invoice deleted successfully',
      deletedInvoice: rows[0],
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

/* =============================================================
   GET /api/invoices/get-overall-stats
   Ventanas móviles de 7 y 14 días (Paid) + stock actual
   ============================================================= */
export async function getOverallStats(req, res) {
  try {
    /* Revenue + unidades vendidas últimos 7 días (status Paid) */
    const [[current]] = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0)         AS totalRevenue,
         COALESCE(SUM(units_sold), 0)     AS totalProductsSold
       FROM invoices
       WHERE status = 'Paid'
         AND invoice_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    /* Revenue + unidades vendidas hace 7-14 días */
    const [[previous]] = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0)         AS totalRevenue,
         COALESCE(SUM(units_sold), 0)     AS totalProductsSold
       FROM invoices
       WHERE status = 'Paid'
         AND invoice_date >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         AND invoice_date <  DATE_SUB(NOW(), INTERVAL 7  DAY)`
    );

    /* Stock actual en productos */
    const [[stockRow]] = await pool.query(
      'SELECT COALESCE(SUM(stock), 0) AS totalStock FROM products'
    );

    const currentRevenue = Number(current.totalRevenue || 0);
    const currentProductsSold = Number(current.totalProductsSold || 0);
    const prevRevenue = Number(previous.totalRevenue || 0);
    const prevProductsSold = Number(previous.totalProductsSold || 0);
    const productsInStock = Number(stockRow.totalStock || 0);

    /* Estimación de stock hace 7 días: stock actual + vendido - comprado.
       Al no tener tabla de compras/restocks en este backend, comprado = 0. */
    const prevProductsInStock = productsInStock + currentProductsSold;

    const getPercentChange = (cur, prev) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Number((((cur - prev) / prev) * 100).toFixed(2));
    };

    const revenueChange = getPercentChange(currentRevenue, prevRevenue);
    const soldChange = getPercentChange(currentProductsSold, prevProductsSold);
    const stockChange = getPercentChange(productsInStock, prevProductsInStock);

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: { value: currentRevenue, change: revenueChange },
        totalProductsSold: {
          value: currentProductsSold,
          change: soldChange,
        },
        productsInStock: {
          value: productsInStock,
          change: stockChange,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating overall stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

/* =============================================================
   GET /api/invoices/get-all-invoices
   Devuelve todas con sus items anidados
   ============================================================= */
export async function getAllInvoices(req, res) {
  try {
    const [invoices] = await pool.query(
      `SELECT id, amount, units_sold, status, invoice_date, due_date,
              reference_number, customer_name, customer_email,
              customer_address, created_at
       FROM invoices
       ORDER BY id DESC`
    );

    if (invoices.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'No invoices found' });
    }

    const [items] = await pool.query(
      `SELECT invoice_id, product_id, product_name, quantity, price
       FROM invoice_items`
    );

    const byInvoice = items.reduce((acc, it) => {
      (acc[it.invoice_id] = acc[it.invoice_id] || []).push({
        productId: it.product_id,
        productName: it.product_name,
        quantity: it.quantity,
        price: Number(it.price),
      });
      return acc;
    }, {});

    const invoicesWithItems = invoices.map((inv) => ({
      id: inv.id,
      amount: Number(inv.amount),
      unitsSold: inv.units_sold,
      status: inv.status,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      referenceNumber: inv.reference_number,
      customer: {
        name: inv.customer_name,
        email: inv.customer_email,
        address: inv.customer_address,
      },
      createdAt: inv.created_at,
      products: byInvoice[inv.id] || [],
    }));

    res.status(200).json({
      success: true,
      message: 'Invoices retrieved successfully',
      invoices: invoicesWithItems,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
}

/* =============================================================
   GET /api/invoices/get-invoice-by-Id/:invoiceId
   ============================================================= */
export async function getInvoiceById(req, res) {
  try {
    const { invoiceId } = req.params;

    const [rows] = await pool.query(
      `SELECT id, amount, units_sold, status, invoice_date, due_date,
              reference_number, customer_name, customer_email,
              customer_address, created_at
       FROM invoices
       WHERE id = ?
       LIMIT 1`,
      [invoiceId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Invoice not found' });
    }

    const inv = rows[0];

    const [items] = await pool.query(
      `SELECT product_id, product_name, quantity, price
       FROM invoice_items
       WHERE invoice_id = ?`,
      [invoiceId]
    );

    res.status(200).json({
      success: true,
      message: 'Invoice retrieved successfully',
      invoice: {
        id: inv.id,
        amount: Number(inv.amount),
        unitsSold: inv.units_sold,
        status: inv.status,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        referenceNumber: inv.reference_number,
        customer: {
          name: inv.customer_name,
          email: inv.customer_email,
          address: inv.customer_address,
        },
        createdAt: inv.created_at,
        products: items.map((it) => ({
          productId: it.product_id,
          productName: it.product_name,
          quantity: it.quantity,
          price: Number(it.price),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: error.message });
  }
}