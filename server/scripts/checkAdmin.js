
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

const checkAdmin = async () => {
  try {
    await connectDB();

    const admin = await User.findOne({
      email: "admin@ecobin.com"
    }).select("name email role isActive");

    if (admin) {
      console.log("Admin account found!");
      console.log(admin);
    } else {
      console.log("Admin account not found!");
    }
  } catch (error) {
    console.log(error.message);
  } finally {
    await mongoose.disconnect();
  }
};

checkAdmin();
