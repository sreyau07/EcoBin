
const mongoose = require("mongoose");

const binSchema = new mongoose.Schema(
  {
    binId: {
      type: String,
      required: true,
      unique: true
    },

    location: {
      type: String,
      required: true
    },

    latitude: {
  type: Number,
  default: null
},

longitude: {
  type: Number,
  default: null
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

    status: {
      type: String,
      enum: ["Normal", "Warning", "Critical"],
      default: "Normal"
    },

    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bin", binSchema);
