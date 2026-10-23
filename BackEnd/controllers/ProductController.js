import mongoose from "mongoose";
import ProductModel from "../models/ProductModel.js";
import InvoiceModel from "../models/InvoiceModel.js";
import InventoryModel from "../models/InventoryModel.js";
import path from "path";
import fs from "fs";
import csv from "csv-parser";

let isUpdatingStats = false;

const updateInventoryStats = async () => {
  if (isUpdatingStats) {
    return;
  }

  isUpdatingStats = true;

  try {
    const products = await ProductModel.find();

    if (!products || products.length === 0) {
      return;
    }

    const categories = [...new Set(products.map((p) => p.category))].length;
    const totalProducts = products.length;

    const inStockProducts = products.filter(
      (p) => p.availability === "In stock"
    ).length;

    const lowStocksNotInStock = products.filter(
      (p) => p.availability === "Out of stock"
    ).length;

    const lowStocksOrdered = products.filter(
      (p) => p.availability === "Low stock"
    ).length;

    let totalRevenue = 0;
    let productsWithSales = 0;

    products.forEach((product) => {
      const sold = parseInt(product.sold) || 0;
      const price = parseFloat(product.price) || 0;
      const productRevenue = sold * price;
      totalRevenue += productRevenue;

      if (sold > 0) {
        productsWithSales++;
      }
    });

    let topSellingProduct = { sold: 0, price: 0, productName: "None" };
    let maxSold = 0;

    products.forEach((product) => {
      const sold = parseInt(product.sold) || 0;
      if (sold > maxSold) {
        maxSold = sold;
        topSellingProduct = {
          sold: sold,
          price: parseFloat(product.price) || 0,
          productName: product.productName,
        };
      }
    });

    const inventoryData = {
      categories,
      totalProducts,
      revenue: totalRevenue,
      topSelling: topSellingProduct.sold,
      topSellingCost: topSellingProduct.sold * topSellingProduct.price,
      lowStocksOrdered,
      lowStocksNotInStock,
      lastUpdated: new Date(),
    };

    await InventoryModel.findOneAndUpdate({}, inventoryData, {
      upsert: true,
      new: true,
    });
  } catch (error) {
    console.error("Error updating inventory stats:", error);
  } finally {
    isUpdatingStats = false;
  }
};

const initializeSoldFields = async () => {
  try {
    const result = await ProductModel.updateMany(
      { sold: { $exists: false } },
      { $set: { sold: 0 } }
    );

    console.log(
      `Initialized 'sold' field for ${result.modifiedCount} products`
    );
    return result.modifiedCount;
  } catch (error) {
    console.error("Error initializing sold fields:", error);
    return 0;
  }
};

const addSampleSalesData = async (req, res) => {
  try {
    const products = await ProductModel.find().limit(3);

    if (products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    const updates = [];

    if (products[0]) {
      products[0].sold = 15;
      updates.push(products[0].save());
    }

    if (products[1]) {
      products[1].sold = 8;
      updates.push(products[1].save());
    }

    if (products[2]) {
      products[2].sold = 5;
      updates.push(products[2].save());
    }

    await Promise.all(updates);

    await updateInventoryStats();

    res.status(200).json({
      success: true,
      message: "Sample sales data added and stats updated",
      updates: products.map((p) => ({
        name: p.productName,
        sold: p.sold,
        price: p.price,
        revenue: p.sold * p.price,
      })),
    });
  } catch (error) {
    console.error("Error adding sample sales:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add sample sales",
      error: error.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await ProductModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      productName,
      category,
      price,
      quantity,
      unit,
      expiryDate,
      thresholdValue,
    } = req.body;

    if (!productName || !category || !price || !quantity || !unit) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // ✅ Use uploaded file if present
    const imageUrl = req.file ? `${req.file.filename}` : null;

    const product = new ProductModel({
      productName,
      category,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      unit,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      thresholdValue: thresholdValue ? parseInt(thresholdValue) : 0,
      imageUrl,
      sold: 0,
    });

    const savedProduct = await product.save();

    const totalAmount = savedProduct.price * savedProduct.quantity;
    const invoice = new InvoiceModel({
      products: [
        {
          productId: savedProduct._id,
          productName: savedProduct.productName,
          quantity: savedProduct.quantity,
          price: savedProduct.price,
        },
      ],
      amount: totalAmount,
      status: "Unpaid",
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      customer: {
        name: "Direct Entry Customer",
        email: "direct-entry@example.com",
        address: "Added via single product form",
      },
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: savedProduct,
      invoice,
    });
  } catch (error) {
    console.error("Error adding single product:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Product ID already exists. Please try again.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error adding product",
      error: error.message,
    });
  }
};

const addProductsFromCSV = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "CSV file is required" });

    const filePath = path.join(process.cwd(), "uploads", req.file.filename);
    const products = [];

    if (!fs.existsSync(filePath))
      return res.status(400).json({ message: "Uploaded file not found" });

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        try {
          // Trim all string values and handle empty strings
          Object.keys(row).forEach((key) => {
            if (row[key] === "" || row[key] === undefined) row[key] = null;
            else if (typeof row[key] === "string") row[key] = row[key].trim();
          });

          const productData = {
            productName: row.productName,
            category: row.category,
            price: row.price ? parseFloat(row.price) : 0,
            quantity: row.quantity ? parseInt(row.quantity) : 0,
            unit: row.unit,
            expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
            thresholdValue: row.thresholdValue
              ? parseInt(row.thresholdValue)
              : 0,
            sold: 0, // default sold value
          };

          // Only add valid products
          if (
            productData.productName &&
            productData.category &&
            productData.price > 0 &&
            productData.quantity > 0 &&
            productData.unit
          ) {
            products.push(productData);
          }
        } catch (error) {
          console.error("Error processing row:", row, error);
        }
      })
      .on("end", async () => {
        try {
          if (products.length === 0) {
            fs.unlinkSync(filePath);
            return res
              .status(400)
              .json({ message: "No valid products found in CSV" });
          }

          const insertedProducts = [];
          const failedProducts = [];

          for (const product of products) {
            try {
              const productId = await ProductModel.generateProductId();
              const newProduct = new ProductModel({ ...product, productId });
              const savedProduct = await newProduct.save();
              insertedProducts.push(savedProduct);
            } catch (error) {
              console.error("Failed to insert product:", product, error);
              failedProducts.push({ product, error: error.message });
            }
          }

          if (insertedProducts.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
              message: "All products failed to import",
              failedProducts,
            });
          }

          // Create invoice
          const totalAmount = insertedProducts.reduce(
            (sum, p) => sum + p.price * p.quantity,
            0
          );

          const invoiceProducts = insertedProducts.map((p) => ({
            productId: p._id,
            productName: p.productName,
            quantity: p.quantity,
            price: p.price,
          }));

          const invoice = new InvoiceModel({
            products: invoiceProducts,
            amount: totalAmount,
            status: "Unpaid",
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            customer: {
              name: "CSV Import Customer",
              email: "csv-import@example.com",
              address: "Imported via CSV",
            },
          });

          await invoice.save();
          fs.unlinkSync(filePath);

          // Update inventory stats
          setTimeout(() => updateInventoryStats(), 1000);

          res.status(201).json({
            success: true,
            message: `${insertedProducts.length} products added successfully, ${failedProducts.length} failed`,
            products: insertedProducts,
            failedProducts,
            invoice,
            totalAmount,
          });
        } catch (error) {
          console.error("Insert error:", error);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          res.status(500).json({
            message: "Error inserting products",
            error: error.message,
          });
        }
      })
      .on("error", (error) => {
        console.error("CSV parsing error:", error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res
          .status(500)
          .json({ message: "Error parsing CSV file", error: error.message });
      });
  } catch (error) {
    console.error("General error:", error);
    res
      .status(500)
      .json({ message: "Error processing file", error: error.message });
  }
};

const updateProductAvailability = async (req, res) => {
  try {
    const products = await ProductModel.find();
    for (let product of products) {
      if (product.expiryDate && new Date(product.expiryDate) < new Date()) {
        product.quantity = 0;
        product.availability = "Out of stock";
      } else if (product.quantity === 0) product.availability = "Out of stock";
      else if (product.quantity < product.thresholdValue)
        product.availability = "Low stock";
      else product.availability = "In stock";

      await product.save();
    }

    setTimeout(() => updateInventoryStats(), 1000);

    res
      .status(200)
      .json({ message: "Products availability updated successfully" });
  } catch (error) {
    console.error("Error updating availability:", error);
    res
      .status(500)
      .json({ message: "Error updating product availability", error });
  }
};

const orderProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0)
      return res.status(400).json({
        success: false,
        message: "Quantity is required and must be greater than 0",
      });

    const product = await ProductModel.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    if (product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.quantity} units available`,
      });
    }

    const previousSold = parseInt(product.sold) || 0;
    product.quantity -= quantity;
    product.sold = previousSold + quantity;

    console.log(
      `${product.productName}: Updated sold from ${previousSold} to ${product.sold}`
    );

    if (product.quantity === 0) product.availability = "Out of stock";
    else if (product.quantity < product.thresholdValue)
      product.availability = "Low stock";
    else product.availability = "In stock";

    await product.save();

    const invoiceData = {
      products: [
        {
          productId: product._id,
          productName: product.productName,
          quantity,
          price: product.price,
          unit: product.unit,
        },
      ],
      amount: product.price * quantity,
      status: "Unpaid",
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      customer: { name: "Walk-in Customer", email: "N/A", address: "N/A" },
    };

    const savedInvoice = await new InvoiceModel(invoiceData).save();

    setTimeout(() => updateInventoryStats(), 1000);

    res.status(201).json({
      success: true,
      message: "Product ordered successfully and invoice created",
      product: {
        id: product._id,
        name: product.productName,
        remainingQuantity: product.quantity,
        availability: product.availability,
        sold: product.sold,
      },
      invoice: {
        id: savedInvoice._id,
        amount: savedInvoice.amount,
        status: savedInvoice.status,
        dueDate: savedInvoice.dueDate,
      },
    });
  } catch (error) {
    console.error("Error ordering product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to order product",
      error: error.message,
      body: req.body,
    });
  }
};

export {
  getAllProducts,
  addProduct,
  addProductsFromCSV,
  updateProductAvailability,
  orderProduct,
  addSampleSalesData,
  initializeSoldFields,
};
