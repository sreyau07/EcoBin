
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    await connectDB();

    const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("Admin details are missing from .env");
    }

    if (ADMIN_PASSWORD.length < 8) {
      throw new Error("Admin password must contain at least 8 characters");
    }

    const existingAdmin = await User.findOne({
      email: ADMIN_EMAIL.toLowerCase().trim()
    });

    if (existingAdmin) {
      throw new Error("This email already has an account. No changes made.");
    }

    const admin = new User({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin"
    });

    await admin.save();

    console.log("Admin account created successfully!");
    console.log("Admin email:", admin.email);
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
