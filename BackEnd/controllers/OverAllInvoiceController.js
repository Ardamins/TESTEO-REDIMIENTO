// BackEnd/controllers/OverAllInvoiceController.js
import { pool } from '../config/db.js';

const getOverAllInvoiceStats = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM overall_invoice_stats WHERE id = 1 LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No stats found' });
    }

    const s = rows[0];

    const stats = {
      totalInvoices: s.total_invoices,
      processedInvoices: s.processed_invoices,
      unpaidInvoices: s.unpaid_invoices,
      paidAmount: Number(s.paid_amount),
      unpaidAmount: Number(s.unpaid_amount),
      customers: s.customers,
      pendingPayments: s.pending_payments,
      recentTransactions: s.recent_transactions,
      lastUpdated: s.last_updated,
    };

    res.status(200).json({
      success: true,
      message: 'Overall invoice stats retrieved successfully',
      stats,
    });
  } catch (error) {
    console.error('Error fetching overall stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default getOverAllInvoiceStats;