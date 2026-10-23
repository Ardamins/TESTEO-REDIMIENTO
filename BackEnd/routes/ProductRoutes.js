import {
  addProduct,
  addProductsFromCSV,
  getAllProducts,
  orderProduct,
  updateProductAvailability,
} from "../controllers/ProductController.js";
import express from "express";
import multer from "multer";
import path from "path";

const productRouter = express.Router();

const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => {
    return cb(null, `${Date.now()}${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const csvUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

productRouter.get("/get-all-products", getAllProducts);
productRouter.post("/add-single-product", upload.single("image"), addProduct);
productRouter.post(
  "/add-multiple-product",
  csvUpload.single("csvFile"),
  addProductsFromCSV
);
productRouter.put(
  "/update-product-availability/:productId",
  updateProductAvailability
);
productRouter.post("/order-product/:productId", orderProduct);

export default productRouter;
