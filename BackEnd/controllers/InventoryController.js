import ProductModel from "../models/ProductModel.js";
import InventoryModel from "../models/InventoryModel.js";

const getInventoryStats = async (req, res) => {
  try {
    // Always calculate fresh stats
    await updateInventoryStats();

    // Latest stats
    const latestStats = await InventoryModel.findOne().sort({
      lastUpdated: -1,
    });

    if (!latestStats) {
      return res.status(404).json({ message: "No inventory stats found" });
    }

    // 7-day old stats (or closest available older record)
    const pastStats = await InventoryModel.findOne({
      lastUpdated: { $lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).sort({ lastUpdated: -1 });

    // Default differences to 0 if no past data
    const revenueDifference = pastStats
      ? latestStats.totalRevenue - pastStats.totalRevenue
      : 0;

    const productSoldDifference = pastStats
      ? latestStats.totalProductsSold - pastStats.totalProductsSold
      : 0;

    const productInStockDifference = pastStats
      ? latestStats.productsInStock - pastStats.productsInStock
      : 0;

    // Attach differences directly into stats
    const statsWithDiff = {
      ...latestStats.toObject(),
      revenueDifference,
      productSoldDifference,
      productInStockDifference,
    };

    res.status(200).json({
      success: true,
      stats: statsWithDiff,
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateInventoryStats = async () => {
  try {
    const products = await ProductModel.find();
    console.log(`Found ${products.length} products for stats calculation`);

    const categories = new Set(products.map((p) => p.category)).size;
    const totalProducts = products.length;

    // Calculate revenue with proper null checks
    const revenue = products.reduce((acc, p) => {
      const sold = parseInt(p.sold) || 0;
      const price = parseFloat(p.price) || 0;
      return acc + sold * price;
    }, 0);

    // Find top selling product
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

    // Fix threshold field name (was 'threshold', should be 'thresholdValue')
    const lowStocksOrdered = products.filter(
      (p) =>
        p.quantity > 0 && p.quantity < (p.thresholdValue || p.threshold || 0)
    ).length;

    const lowStocksNotInStock = products.filter((p) => p.quantity === 0).length;

    console.log("Calculated stats:", {
      categories,
      totalProducts,
      revenue,
      topSelling,
      topSellingCost,
      lowStocksOrdered,
      lowStocksNotInStock,
    });

    // Update or create inventory record
    let inventory = await InventoryModel.findOne();
    if (!inventory) {
      inventory = new InventoryModel({});
    }

    inventory.categories = categories;
    inventory.totalProducts = totalProducts;
    inventory.revenue = revenue;
    inventory.topSelling = topSelling;
    inventory.topSellingCost = topSellingCost;
    inventory.lowStocksOrdered = lowStocksOrdered;
    inventory.lowStocksNotInStock = lowStocksNotInStock;
    inventory.lastUpdated = new Date();

    await inventory.save();
    console.log("Inventory stats updated successfully");

    return inventory;
  } catch (error) {
    console.error("Error updating inventory stats:", error);
    throw error;
  }
};

const refreshInventoryStats = async (req, res) => {
  try {
    const updatedStats = await updateInventoryStats();
    res.status(200).json({
      success: true,
      message: "Inventory stats refreshed successfully",
      stats: updatedStats,
    });
  } catch (error) {
    console.error("Error refreshing inventory stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh stats",
      error: error.message,
    });
  }
};

export { getInventoryStats, updateInventoryStats, refreshInventoryStats };
