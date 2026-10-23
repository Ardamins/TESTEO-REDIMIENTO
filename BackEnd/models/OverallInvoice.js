import mongoose from "mongoose";

const OverallInvoiceSchema = new mongoose.Schema({
  recentTransactions: { type: Number, default: 0 },
  totalInvoices: { type: Number, default: 0 },
  processedInvoices: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  customers: { type: Number, default: 0 },
  unpaidAmount: { type: Number, default: 0 },
  pendingPayments: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

export const OverallInvoice = mongoose.model(
  "OverallInvoice",
  OverallInvoiceSchema
);

const OverAllInvoiceModel =
  mongoose.models.OverAllInvoice ||
  mongoose.model("OverAllInvoice", OverallInvoiceSchema);
export default OverAllInvoiceModel;
