import {
  getAdminByEmail,
  loginAdmin,
  registerAdmin,
  resetPassword,
  updateProfile,
  verifyEmail,
  verifyOTP,
} from "../controllers/AdminController.js";
import express from "express";

const adminRouter = express.Router();

adminRouter.post("/register", registerAdmin);
adminRouter.post("/login", loginAdmin);
adminRouter.put("/update-profile", updateProfile);
adminRouter.post("/verify-email", verifyEmail);
adminRouter.post("/verify-otp", verifyOTP);
adminRouter.post("/reset-password", resetPassword);
adminRouter.get("/get-admin-details/:email", getAdminByEmail);

export default adminRouter;
