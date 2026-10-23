import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    unique: true,
  },
  referenceNumber: {
    type: String,
    default: null,
  },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      productName: String,
      quantity: Number,
      price: Number,
    },
  ],
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Paid", "Unpaid"],
    default: "Unpaid",
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
  },
  customer: {
    name: String,
    email: String,
    address: String,
  },
});

InvoiceSchema.pre("save", async function (next) {
  if (!this.invoiceId) {
    try {
      // Use mongoose.model() to get the Invoice model to avoid circular dependency
      const Invoice = mongoose.model("Invoice");
      const lastInvoice = await Invoice.findOne().sort({ _id: -1 });
      let nextNumber = 1000;
      if (lastInvoice && lastInvoice.invoiceId) {
        const parts = lastInvoice.invoiceId.split("-");
        if (parts.length > 1) {
          nextNumber = parseInt(parts[1]) + 1;
        }
      }
      this.invoiceId = `INV-${nextNumber}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const InvoiceModel =
  mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
export default InvoiceModel;
