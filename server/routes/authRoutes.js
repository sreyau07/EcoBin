
const express = require("express");
const router = express.Router();

const {
  loginUser,
  createWorker,
    getWorkers,
    updateWorkerStatus
} = require("../controllers/authController");

const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");

// Public login
router.post("/login", loginUser);

// Admin-only worker registration
router.post("/workers", protect, adminOnly, createWorker);
router.get("/workers", protect, adminOnly, getWorkers);
router.patch("/workers/:id/status", protect, adminOnly, updateWorkerStatus);

module.exports = router;
