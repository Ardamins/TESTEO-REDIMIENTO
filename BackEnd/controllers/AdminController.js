// BackEnd/controllers/AdminController.js
import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import nodemailer from 'nodemailer';

/* -------------------------------------------------------------
   OTP store en memoria (mismo comportamiento que antes)
   ------------------------------------------------------------- */
const otpStore = {};

/* -------------------------------------------------------------
   Helpers
   ------------------------------------------------------------- */
const createToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* =============================================================
   POST /api/admin/login
   body: { email, password }
   ============================================================= */
export async function loginAdmin(req, res) {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required' });
    }

    const [rows] = await pool.query(
      'SELECT id, first_name, last_name, email, password FROM admins WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: 'Admin not exist' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }

    const token = createToken(admin.id);

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin.id,
        firstName: admin.first_name,
        lastName: admin.last_name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =============================================================
   POST /api/admin/register
   body: { name, email, password }
   ============================================================= */
export async function registerAdmin(req, res) {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required' });
    }

    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: 'Please enter a valid email' });
    }

    if (name.trim().length < 2) {
      return res
        .status(400)
        .json({ success: false, message: 'Name must be at least 2 characters' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [exists] = await pool.query(
      'SELECT id FROM admins WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );
    if (exists.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: 'Admin already exists' });
    }

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO admins (first_name, last_name, email, password) VALUES (?, ?, ?, ?)',
      [firstName, lastName, normalizedEmail, hashedPassword]
    );

    const token = createToken(result.insertId);

    res.status(201).json({
      success: true,
      token,
      admin: {
        id: result.insertId,
        firstName,
        lastName,
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/* =============================================================
   PUT /api/admin/update-profile
   body: { email, firstName, lastName, newPassword, confirmPassword }
   ============================================================= */
export async function updateProfile(req, res) {
  const { email, firstName, lastName, newPassword, confirmPassword } = req.body;

  try {
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'Email is required' });
    }

    const [rows] = await pool.query(
      'SELECT id, first_name, last_name, email FROM admins WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found with this email' });
    }

    const admin = rows[0];

    const updates = {};
    if (firstName) updates.first_name = firstName.trim();
    if (lastName) updates.last_name = lastName.trim();

    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters',
        });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New password and confirmation don't match",
        });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(newPassword, salt);
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No fields to update' });
    }

    const fields = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), admin.id];

    await pool.query(`UPDATE admins SET ${fields} WHERE id = ?`, values);

    const [updatedRows] = await pool.query(
      'SELECT id, first_name, last_name, email FROM admins WHERE id = ?',
      [admin.id]
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: updatedRows[0].id,
        firstName: updatedRows[0].first_name,
        lastName: updatedRows[0].last_name,
        email: updatedRows[0].email,
      },
      shouldLogout: true,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server error during profile update' });
  }
}

/* =============================================================
   POST /api/admin/verify-email
   body: { email }
   ============================================================= */
export async function verifyEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const [rows] = await pool.query(
      'SELECT id FROM admins WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ message: 'Please enter a registered email id' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It is valid for 5 minutes.`,
    });

    res
      .status(200)
      .json({ message: 'OTP sent successfully to your registered email' });
  } catch (err) {
    console.error('verifyEmail error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/* =============================================================
   POST /api/admin/verify-otp
   body: { email, otp }
   ============================================================= */
export function verifyOTP(req, res) {
  const { email, otp } = req.body;
  const storedOtp = otpStore[email];

  if (!storedOtp) {
    return res
      .status(400)
      .json({ message: 'OTP not found. Please request again.' });
  }

  if (storedOtp.expiresAt < Date.now()) {
    return res.status(400).json({ message: 'OTP expired. Request a new one.' });
  }

  if (parseInt(otp) !== storedOtp.otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  res.json({ message: 'OTP verified successfully' });
}

/* =============================================================
   POST /api/admin/reset-password
   body: { email, newPassword, confirmPassword }
   ============================================================= */
export async function resetPassword(req, res) {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Email and new password are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const [rows] = await pool.query(
      'SELECT id FROM admins WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE admins SET password = ? WHERE id = ?', [
      hashed,
      rows[0].id,
    ]);

    delete otpStore[email];

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ error: err.message });
  }
}

/* =============================================================
   GET /api/admin/get-admin-details/:email
   ============================================================= */
export async function getAdminByEmail(req, res) {
  try {
    const { email } = req.params;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'Email is required' });
    }

    const [rows] = await pool.query(
      'SELECT id, first_name, last_name, email FROM admins WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Admin not found' });
    }

    res.status(200).json({
      success: true,
      admin: {
        id: rows[0].id,
        firstName: rows[0].first_name,
        lastName: rows[0].last_name,
        email: rows[0].email,
      },
    });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}