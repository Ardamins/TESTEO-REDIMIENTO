import express from "express";
import getOverAllInvoiceStats from "../controllers/OverAllInvoiceController.js";

const overallInvoiceRouter = express.Router();

overallInvoiceRouter.get("/get-overall-invoice-stats", getOverAllInvoiceStats);

export default overallInvoiceRouter;
