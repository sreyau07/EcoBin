const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    binId: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    previousFillLevel: {
      type: Number,
      required: true
    },
    collectedAt: {
      type: Date,
      default: Date.now
    },
    collectedBy: {
      type: String,
      default: "Collection Worker"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Collection", collectionSchema);