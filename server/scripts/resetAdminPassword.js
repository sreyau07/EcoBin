
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const resetPassword = async () => {
  try {
    await connectDB();

    const newPassword = process.env.ADMIN_RESET_PASSWORD;

    if (!newPassword || newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const admin = await User.findOne({
      email: "admin@ecobin.com"
    });

    if (!admin) {
      throw new Error("Admin account not found");
    }

    admin.password = newPassword;
    await admin.save();

    console.log("Admin password reset successfully!");

  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

resetPassword();
