
const express = require("express");
const router = express.Router();
// Require login for all bin APIs
const {
  protect,
  adminOnly
} = require("../middleware/authMiddleware");


const {
  getBins,
  updateBin,
   updateBinLocation,
  getBinHistory,
  getBinPrediction,
  optimizeRoute,
   markBinCollected,
    getCollectionHistory,
    getNotifications,
markNotificationRead,
markAllNotificationsRead
} = require("../controllers/binController");
// Get all bins

router.use(protect);
router.get("/", getBins);
router.patch("/collect/:binId", markBinCollected);
router.patch("/location/:binId", updateBinLocation);
// Add or update bin sensor data
router.post("/",adminOnly, updateBin);

// Get historical sensor readings
router.get("/history/:binId", getBinHistory);

// Predict future bin fill level
router.get("/prediction/:binId", getBinPrediction);
// Optimize waste collection route
router.get("/optimize-route", optimizeRoute);
router.get("/collections", getCollectionHistory);

// Notification routes
router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);

module.exports = router;

