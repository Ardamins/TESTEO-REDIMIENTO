// BackEnd/controllers/ProductController.js
import { pool } from '../config/db.js';

/* =========================================================
   GET /api/products/get-all-products
   ========================================================= */
export async function getAllProducts(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, price, stock, image, created_at
       FROM products
       ORDER BY id DESC`
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error('getAllProducts error:', err);
    res.status(500).json({ error: 'DB error' });
  }
}

/* =========================================================
   POST /api/products/add-single-product
   body: { name, price, stock }   + multipart file "image"
   ========================================================= */
export async function addProduct(req, res) {
  try {
    const { name, price, stock } = req.body;

    if (!name || !price || stock === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, price, stock',
      });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO products (name, price, stock, image) VALUES (?, ?, ?, ?)',
      [name, Number(price), Number(stock), image]
    );

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      id: result.insertId,
    });
  } catch (err) {
    console.error('addProduct error:', err);
    res.status(500).json({ error: 'DB error' });
  }
}

/* =========================================================
   POST /api/products/add-multiple-product
   multipart file "csvFile"
   ========================================================= */
export async function addProductsFromCSV(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const fs = await import('fs');
    const path = await import('path');
    const csv = (await import('csv-parser')).default;

    const filePath = path.join(process.cwd(), 'uploads', req.file.filename);
    const rows = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Empty CSV file' });
    }

    const inserted = [];
    const failed = [];

    for (const row of rows) {
      try {
        const name = (row.name || row.productName || '').trim();
        const price = Number(row.price ?? 0);
        const stock = Number(row.stock ?? row.quantity ?? 0);
        const image = row.image ? String(row.image).trim() : null;

        if (!name || !Number.isFinite(price) || !Number.isFinite(stock)) {
          failed.push({ row, error: 'Invalid row' });
          continue;
        }

        const [result] = await pool.query(
          'INSERT INTO products (name, price, stock, image) VALUES (?, ?, ?, ?)',
          [name, price, stock, image]
        );

        inserted.push({ id: result.insertId, name, price, stock, image });
      } catch (e) {
        failed.push({ row, error: e.message });
      }
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (inserted.length === 0) {
      return res.status(400).json({
        error: 'All products failed to import',
        failed,
      });
    }

    res.status(201).json({
      success: true,
      message: `${inserted.length} products inserted, ${failed.length} failed`,
      products: inserted,
      failed,
    });
  } catch (err) {
    console.error('addProductsFromCSV error:', err);
    res.status(500).json({ error: 'Error processing CSV', detail: err.message });
  }
}

/* =========================================================
   PUT /api/products/update-product-availability/:productId
   Recalcula el estado según stock (si tienes columna availability
   en tu tabla, la actualiza; si no, la ignora).
   ========================================================= */
export async function updateProductAvailability(req, res) {
  try {
    const { productId } = req.params;

    const [rows] = await pool.query(
      'SELECT id, name, stock FROM products WHERE id = ?',
      [productId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = rows[0];
    const availability =
      product.stock <= 0
        ? 'Out of stock'
        : product.stock < 10
        ? 'Low stock'
        : 'In stock';

    // Si tu tabla tiene columna availability, descomenta la query:
    // await pool.query('UPDATE products SET availability = ? WHERE id = ?',
    //   [availability, productId]);

    res.status(200).json({
      success: true,
      id: product.id,
      stock: product.stock,
      availability,
    });
  } catch (err) {
    console.error('updateProductAvailability error:', err);
    res.status(500).json({ error: 'DB error' });
  }
}

/* =========================================================
   POST /api/products/order-product/:productId
   body: { quantity }
   Descuenta stock y registra la venta de forma atómica.
   ========================================================= */
export async function orderProduct(req, res) {
  const conn = await pool.getConnection();
  try {
    const { productId } = req.params;
    const quantity = Number(req.body?.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      conn.release();
      return res.status(400).json({
        error: 'Quantity is required and must be > 0',
      });
    }

    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = rows[0];

    if (product.stock < quantity) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: `Insufficient stock. Only ${product.stock} units available`,
      });
    }

    await conn.query(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [quantity, productId]
    );

    await conn.commit();
    conn.release();

    res.status(201).json({
      success: true,
      message: 'Order registered',
      product: {
        id: product.id,
        name: product.name,
        remainingStock: product.stock - quantity,
        unitPrice: product.price,
        total: product.price * quantity,
      },
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    conn.release();
    console.error('orderProduct error:', err);
    res.status(500).json({ error: 'DB error' });
  }
}

/* =========================================================
   Compatibilidad con otros archivos que importaban estos
   nombres desde el controlador anterior (Mongoose).
   Se dejan como stubs seguros para no romper imports.
   ========================================================= */
export async function addSampleSalesData(req, res) {
  res.status(501).json({ error: 'Not implemented for MySQL yet' });
}

export async function initializeSoldFields(req, res) {
  res.status(501).json({ error: 'Not implemented for MySQL yet' });
}