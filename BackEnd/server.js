import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';

// Imports con los nombres EXACTOS de tu carpeta routes
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

// Rutas
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/overall-invoices', overallInvoiceRoutes);
app.use('/api/products', productRoutes);

// Ruta de salud para k6
app.get('/api/health', (req, res) => {
  res.json({ ok: true, online: true, timestamp: new Date().toISOString() });
});

// Conexión a MongoDB local
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  try {
    if (!MONGO_URI) throw new Error('Falta MONGO_URI en el .env');
    
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected (local)');

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error arrancando el servidor:', err.message);
    process.exit(1);
  }
}

start();