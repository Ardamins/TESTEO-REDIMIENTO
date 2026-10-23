import express from "express";
import { getDashboardStats } from "../controllers/DashboardController.js";

const dashboardRouter = express.Router();

dashboardRouter.get("/stats/:type", getDashboardStats);

export default dashboardRouter;
