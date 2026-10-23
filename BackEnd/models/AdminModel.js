import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const AdminModel =
  mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default AdminModel;
