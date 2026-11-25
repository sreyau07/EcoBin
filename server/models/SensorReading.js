
const mongoose = require("mongoose");

const sensorReadingSchema = new mongoose.Schema(
  {
    binId: {
      type: String,
      required: true,
      index: true
    },

    fillLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    gasLevel: {
      type: Number,
      default: 0
    },

    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SensorReading",
  sensorReadingSchema
);
