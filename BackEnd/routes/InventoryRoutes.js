import express from "express";
import {
  getInventoryStats,
  updateInventoryStats,
} from "../controllers/InventoryController.js";

const inventoryRouter = express.Router();

inventoryRouter.get("/get-inventory-stats", getInventoryStats);
inventoryRouter.put("/update-inventory-stats", updateInventoryStats);

export default inventoryRouter;
