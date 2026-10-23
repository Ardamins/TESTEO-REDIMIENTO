import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  productId: { type: String, unique: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  expiryDate: { type: Date },
  thresholdValue: { type: Number },
  imageUrl: { type: String },
  availability: { type: String, default: "In stock" },
  sold: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

ProductSchema.statics.generateProductId = async function () {
  const lastProduct = await this.findOne().sort({ productId: -1 });
  let nextIdNum = 1;

  if (lastProduct && lastProduct.productId) {
    const lastIdNum = parseInt(lastProduct.productId.slice(1));
    nextIdNum = lastIdNum + 1;
  }

  return "P" + nextIdNum.toString().padStart(3, "0");
};

ProductSchema.statics.generateProductIds = async function (count) {
  const lastProduct = await this.findOne().sort({ productId: -1 });
  let nextIdNum = 1;

  if (lastProduct && lastProduct.productId) {
    const lastIdNum = parseInt(lastProduct.productId.slice(1));
    nextIdNum = lastIdNum + 1;
  }

  const productIds = [];
  for (let i = 0; i < count; i++) {
    productIds.push("P" + (nextIdNum + i).toString().padStart(3, "0"));
  }

  return productIds;
};

ProductSchema.pre("save", async function (next) {
  if (!this.productId) {
    try {
      const Product = mongoose.model("Product");
      this.productId = await Product.generateProductId();
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const ProductModel =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default ProductModel;
