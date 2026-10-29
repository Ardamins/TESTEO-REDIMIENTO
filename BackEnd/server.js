// BackEnd/server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';

import adminRoutes from './routes/AdminRoutes.js';
import dashboardRoutes from './routes/DashboardRoutes.js';
import inventoryRoutes from './routes/InventoryRoutes.js';
import invoiceRoutes from './routes/InvoiceRoutes.js';
import overallInvoiceRoutes from './routes/OverallInvoiceRoutes.js';
import productRoutes from './routes/ProductRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/overall-invoices', overallInvoiceRoutes);
app.use('/api/products', productRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, online: true, timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error arrancando el servidor:', err.message);
    process.exit(1);
  }
}

start();