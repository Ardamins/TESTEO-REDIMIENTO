import express from "express";
import {
  deleteInvoice,
  getAllInvoices,
  getInvoiceById,
  getOverallStats,
  payInvoice,
  updateOverallStats,
} from "../controllers/InvoiceController.js";

const invoiceRouter = express.Router();

invoiceRouter.put("/update-all-stats", updateOverallStats);
invoiceRouter.put("/pay-invoice/:invoiceId", payInvoice);
invoiceRouter.delete("/delete-invoice/:invoiceId", deleteInvoice);
invoiceRouter.get("/get-overall-stats", getOverallStats);
invoiceRouter.get("/get-all-invoices", getAllInvoices);
invoiceRouter.get("/get-invoice-by-Id/:invoiceId", getInvoiceById);

export default invoiceRouter;
