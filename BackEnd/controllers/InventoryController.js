// BackEnd/controllers/InventoryController.js
import { pool } from '../config/db.js';

/* =============================================================
   Calcula y persiste las estadísticas de inventario en la
   tabla `inventory_stats` (una sola fila "singleton" id=1).
   Devuelve el objeto actualizado.
   ============================================================= */
export async function updateInventoryStats() {
  try {
    const [products] = await pool.query(
      `SELECT id, name, price, stock, sold, category, created_at
       FROM products`
    );

    const categories = new Set(
      products.map((p) => p.category).filter(Boolean)
    ).size;
    const totalProducts = products.length;

    /* Revenue = suma de (sold * price) */
    const revenue = products.reduce((acc, p) => {
      const sold = parseInt(p.sold) || 0;
      const price = parseFloat(p.price) || 0;
      return acc + sold * price;
    }, 0);

    /* Producto más vendido */
    let topSellingProduct = null;
    let maxSold = 0;
    for (const product of products) {
      const sold = parseInt(product.sold) || 0;
      if (sold > maxSold) {
        maxSold = sold;
        topSellingProduct = product;
      }
    }

    const topSelling = topSellingProduct
      ? parseInt(topSellingProduct.sold) || 0
      : 0;
    const topSellingCost = topSellingProduct
      ? (parseInt(topSellingProduct.sold) || 0) *
        (parseFloat(topSellingProduct.price) || 0)
      : 0;

    /* Low stock: stock entre 1 y menos que 10 (threshold fijo) */
    const lowStocksOrdered = products.filter(
      (p) => Number(p.stock) > 0 && Number(p.stock) < 10
    ).length;

    /* Out of stock */
    const lowStocksNotInStock = products.filter(
      (p) => Number(p.stock) === 0
    ).length;

    /* Upsert singleton id=1 */
    await pool.query(
      `INSERT INTO inventory_stats
         (id, categories, total_products, revenue,
          top_selling, top_selling_cost,
          low_stocks_ordered, low_stocks_not_in_stock,
          last_updated)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         categories = VALUES(categories),
         total_products = VALUES(total_products),
         revenue = VALUES(revenue),
         top_selling = VALUES(top_selling),
         top_selling_cost = VALUES(top_selling_cost),
         low_stocks_ordered = VALUES(low_stocks_ordered),
         low_stocks_not_in_stock = VALUES(low_stocks_not_in_stock),
         last_updated = NOW()`,
      [
        categories,
        totalProducts,
        revenue,
        topSelling,
        topSellingCost,
        lowStocksOrdered,
        lowStocksNotInStock,
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM inventory_stats WHERE id = 1'
    );

    return rows[0] || null;
  } catch (error) {
    console.error('Error updating inventory stats:', error);
    throw error;
  }
}

/* =============================================================
   GET /api/inventory/get-inventory-stats
   Recalcula y devuelve las stats con diferencias vs. hace 7 días.
   ============================================================= */
export async function getInventoryStats(req, res) {
  try {
    await updateInventoryStats();

    const [latestRows] = await pool.query(
      'SELECT * FROM inventory_stats WHERE id = 1'
    );
    const latestStats = latestRows[0];

    if (!latestStats) {
      return res.status(404).json({ message: 'No inventory stats found' });
    }

    /* Histórico: si tienes tabla inventory_stats_history,
       esta query devuelve la fila más reciente con más de 7 días.
       Si no existe la tabla, se ignora silenciosamente. */
    let pastStats = null;
    try {
      const [pastRows] = await pool.query(
        `SELECT * FROM inventory_stats_history
         WHERE last_updated <= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY last_updated DESC
         LIMIT 1`
      );
      pastStats = pastRows[0] || null;
    } catch (_) {
      /* tabla opcional, no rompe */
    }

    const revenueDifference = pastStats
      ? Number(latestStats.revenue) - Number(pastStats.revenue)
      : 0;
    const productSoldDifference = pastStats
      ? Number(latestStats.top_selling) - Number(pastStats.top_selling)
      : 0;
    const productInStockDifference = pastStats
      ? Number(latestStats.total_products) -
        Number(pastStats.total_products)
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        categories: latestStats.categories,
        totalProducts: latestStats.total_products,
        revenue: Number(latestStats.revenue),
        topSelling: latestStats.top_selling,
        topSellingCost: Number(latestStats.top_selling_cost),
        lowStocksOrdered: latestStats.low_stocks_ordered,
        lowStocksNotInStock: latestStats.low_stocks_not_in_stock,
        lastUpdated: latestStats.last_updated,
        revenueDifference,
        productSoldDifference,
        productInStockDifference,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =============================================================
   PUT /api/inventory/update-inventory-stats
   Fuerza recálculo.
   ============================================================= */
export async function refreshInventoryStats(req, res) {
  try {
    const updated = await updateInventoryStats();

    if (!updated) {
      return res
        .status(500)
        .json({ success: false, message: 'No inventory stats returned' });
    }

    res.status(200).json({
      success: true,
      message: 'Inventory stats refreshed successfully',
      stats: {
        categories: updated.categories,
        totalProducts: updated.total_products,
        revenue: Number(updated.revenue),
        topSelling: updated.top_selling,
        topSellingCost: Number(updated.top_selling_cost),
        lowStocksOrdered: updated.low_stocks_ordered,
        lowStocksNotInStock: updated.low_stocks_not_in_stock,
        lastUpdated: updated.last_updated,
      },
    });
  } catch (error) {
    console.error('Error refreshing inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh stats',
      error: error.message,
    });
  }
}