
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    binId: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    fillLevel: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ["Warning", "Critical"],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
