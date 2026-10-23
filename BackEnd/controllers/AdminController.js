import AdminModel from "../models/AdminModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import nodemailer from "nodemailer";

let otpStore = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Admin not exist" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = createToken(admin._id);
    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        password: admin.password,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const registerAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // check email format
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email" });
    }

    // check name length
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters",
      });
    }

    // check password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // check if admin already exists
    const exists = await AdminModel.findOne({
      email: email.toLowerCase().trim(),
    });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Admin already exists" });
    }

    // split name into firstName and lastName
    let firstName = "";
    let lastName = "";

    const nameParts = name.trim().split(" ");
    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = ""; // no last name provided
    } else {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" "); // join rest of the name
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // save new admin
    const newAdmin = new AdminModel({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const admin = await newAdmin.save();
    const token = createToken(admin._id);

    res.status(201).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  const { email, firstName, lastName, newPassword, confirmPassword } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to identify the admin",
      });
    }

    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found with this email" });
    }

    let shouldLogout = false;
    const updates = {};

    if (firstName) {
      updates.firstName = firstName.trim();
    }

    if (lastName) {
      updates.lastName = lastName.trim();
    }

    if (firstName || lastName) {
      const fName = firstName?.trim() || admin.firstName;
      const lName = lastName?.trim() || admin.lastName;
      updates.name = `${fName} ${lName}`;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters",
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

    const updatedAdmin = await AdminModel.findByIdAndUpdate(
      admin._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");
    shouldLogout = true;
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      admin: updatedAdmin,
      shouldLogout, // Return the logout flag
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during profile update" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return res
        .status(400)
        .json({ message: "Please enter a registered email id" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    admin.resetOtpExpiry = Date.now() + 5 * 60 * 1000;
    await admin.save();
    otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. It is valid for 5 minutes.`,
    });

    res
      .status(200)
      .json({ message: "OTP sent successfully to your registered email" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const verifyOTP = (req, res) => {
  const { email, otp } = req.body;
  const storedOtp = otpStore[email];

  if (!storedOtp) {
    return res
      .status(400)
      .json({ message: "OTP not found. Please request again." });
  }

  if (storedOtp.expiresAt < Date.now()) {
    return res.status(400).json({ message: "OTP expired. Request a new one." });
  }

  if (parseInt(otp) !== storedOtp.otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  res.json({ message: "OTP verified successfully" });
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const admin = await AdminModel.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid request" });

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    delete otpStore[email];

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAdminByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const admin = await AdminModel.findOne({ email }).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    console.error("Get admin error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  loginAdmin,
  registerAdmin,
  updateProfile,
  verifyEmail,
  verifyOTP,
  resetPassword,
  getAdminByEmail,
};
