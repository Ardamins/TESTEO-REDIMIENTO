import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema({
  categories: { type: Number, required: true },
  totalProducts: { type: Number, required: true },
  revenue: { type: Number, required: true },
  topSelling: { type: Number, required: true },
  topSellingCost: { type: Number, required: true },
  lowStocksOrdered: { type: Number, required: true },
  lowStocksNotInStock: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

const InventoryModel =
  mongoose.models.Inventory || mongoose.model("Inventory", InventorySchema);
export default InventoryModel;
