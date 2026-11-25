const SensorReading = require("../models/SensorReading");
const Bin = require("../models/Bin");
const Collection = require("../models/Collection");
const Notification = require("../models/Notification");

// Get all bins
const getBins = async (req, res) => {
  try {
    const bins = await Bin.find();
    res.status(200).json(bins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add or update bin sensor data

const updateBin = async (req, res) => {
  try {
   const {
  binId,
  location,
  latitude,
  longitude,
  fillLevel,
  gasLevel
} = req.body;
    if (!binId || !location || fillLevel === undefined) {
      return res.status(400).json({
        success: false,
        message: "binId, location and fillLevel are required"
      });
    }

    if (
      typeof fillLevel !== "number" ||
      fillLevel < 0 ||
      fillLevel > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Fill level must be between 0 and 100"
      });
    }

    const status =
      fillLevel >= 80
        ? "Critical"
        : fillLevel >= 60
        ? "Warning"
        : "Normal";

    // Update the latest bin information
    const bin = await Bin.findOneAndUpdate(
      { binId },
      {
        binId,
        location,
          latitude: latitude ?? null,
  longitude: longitude ?? null,
        fillLevel,
        gasLevel: gasLevel ?? 0,
        status,
        lastUpdated: new Date()
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    // Save every sensor reading as historical data
    const reading = await SensorReading.create({
      binId,
      fillLevel,
      gasLevel: gasLevel ?? 0,
      recordedAt: new Date()
    });
    // Create or update an unread notification
if (status === "Warning" || status === "Critical") {
  const message =
    status === "Critical"
      ? "Urgent! Waste bin requires immediate collection."
      : "Warning! Waste bin collection is recommended.";

  await Notification.findOneAndUpdate(
    { binId, isRead: false },
    {
      $set: {
        location,
        fillLevel,
        type: status,
        message
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
} else {
  await Notification.updateMany(
    { binId, isRead: false },
    { $set: { isRead: true } }
  );
}
    res.status(200).json({
      success: true,
      message: "Bin and sensor history updated successfully",
      bin,
      reading
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
const getBinHistory = async (req, res) => {
  try {
    const { binId } = req.params;

    const readings = await SensorReading.find({ binId })
      .sort({ recordedAt: 1 });

    res.status(200).json({
      success: true,
      count: readings.length,
      readings
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
const getBinPrediction = async (req, res) => {
  try {
    const { binId } = req.params;

    // Get historical readings in chronological order
    const readings = await SensorReading.find({ binId })
      .sort({ recordedAt: 1 });

    if (readings.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Not enough historical data for prediction"
      });
    }

    // Find the latest collection/reset in the readings.
    // A decrease of 20 or more percentage points is treated
    // as a possible bin collection/reset.
    let startIndex = 0;

    for (let i = 1; i < readings.length; i++) {
      const previous = readings[i - 1].fillLevel;
      const current = readings[i].fillLevel;

      if (previous - current >= 20) {
        startIndex = i;
      }
    }

    // Use readings only from the latest collection cycle
    const recentReadings = readings.slice(startIndex);

    if (recentReadings.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Not enough readings after the latest collection"
      });
    }

    const firstReading = recentReadings[0];
    const latestReading = recentReadings[recentReadings.length - 1];

    const timeDifference =
      (new Date(latestReading.recordedAt) -
       new Date(firstReading.recordedAt)) /
      (1000 * 60 * 60);

   
    if (timeDifference < 0.5) {
  return res.status(400).json({
    success: false,
    message: "Please wait at least 30 minutes between readings for a reliable prediction"
  });
}

    // Calculate filling rate
    const rawFillRate =
      (latestReading.fillLevel - firstReading.fillLevel) /
      timeDifference;

    // Do not display negative filling rates
    const fillRate = Math.max(0, rawFillRate);

    // Predict fill level after six hours
    const predictionHours = 6;

    const predictedFillLevel = Math.min(
      100,
      latestReading.fillLevel + fillRate * predictionHours
    );

    const willReachCritical = predictedFillLevel >= 80;

    return res.status(200).json({
      success: true,
      binId,
      currentFillLevel: latestReading.fillLevel,
      predictedFillLevel: Number(predictedFillLevel.toFixed(2)),
      predictionHours,
      fillRatePerHour: Number(fillRate.toFixed(2)),
      willReachCritical,
      message: willReachCritical
        ? "Warning: Bin may reach critical level within 6 hours"
        : "Bin is not predicted to reach critical level within 6 hours"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const optimizeRoute = async (req, res) => {
  try {
    const startLat = Number(req.query.startLat);
    const startLng = Number(req.query.startLng);

    if (
      !Number.isFinite(startLat) ||
      !Number.isFinite(startLng) ||
      req.query.startLat === undefined ||
      req.query.startLng === undefined ||
      startLat < -90 || startLat > 90 ||
      startLng < -180 || startLng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid startLat and startLng are required"
      });
    }

    // Find bins that need collection and have GPS coordinates
    const bins = await Bin.find({
      fillLevel: { $gte: 60 },
      latitude: { $ne: null },
      longitude: { $ne: null }
    });

    if (bins.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No bins currently require collection",
        route: [],
        totalBins: 0,
        totalDistanceKm: 0
      });
    }

    // Calculate distance between two GPS points
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const toRadians = (degree) => degree * Math.PI / 180;

      const dLat = toRadians(lat2 - lat1);
      const dLng = toRadians(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) ** 2;

      return 6371 * 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );
    };

    let currentLat = startLat;
    let currentLng = startLng;

    const remainingBins = [...bins];
    const route = [];
    let totalDistance = 0;

    // Nearest Neighbor Algorithm
    while (remainingBins.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      remainingBins.forEach((bin, index) => {
        const distance = calculateDistance(
          currentLat,
          currentLng,
          bin.latitude,
          bin.longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      const nearestBin = remainingBins.splice(nearestIndex, 1)[0];

      totalDistance += nearestDistance;

      route.push({
        binId: nearestBin.binId,
        location: nearestBin.location,
        latitude: nearestBin.latitude,
        longitude: nearestBin.longitude,
        fillLevel: nearestBin.fillLevel,
        status: nearestBin.status,
        distanceFromPreviousKm: Number(nearestDistance.toFixed(2))
      });

      currentLat = nearestBin.latitude;
      currentLng = nearestBin.longitude;
    }

    res.status(200).json({
      success: true,
      message: "Collection route generated successfully",
      algorithm: "Nearest Neighbor",
      totalBins: route.length,
      totalDistanceKm: Number(totalDistance.toFixed(2)),
      route
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// Mark bin as collected

const markBinCollected = async (req, res) => {
  try {
    const { binId } = req.params;

    // Find the bin
    const bin = await Bin.findOne({ binId });

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: "Bin not found"
      });
    }

    // Get the logged-in worker's name
    const collectedBy = req.user?.name || "Collection Worker";

    // Save collection details
    const collection = await Collection.create({
      binId: bin.binId,
      location: bin.location,
      previousFillLevel: bin.fillLevel,
      collectedBy: collectedBy
    });

    // Reset bin after collection
    bin.fillLevel = 0;
    bin.status = "Normal";
    bin.lastUpdated = new Date();

    await bin.save();

    // Mark previous notifications as read
    await Notification.updateMany(
      { binId: bin.binId, isRead: false },
      { $set: { isRead: true } }
    );

    // Save a zero-level sensor reading
    await SensorReading.create({
      binId: bin.binId,
      fillLevel: 0,
      gasLevel: bin.gasLevel
    });

    res.status(200).json({
      success: true,
      message: "Bin collected successfully",
      collection,
      bin
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get collection history
const getCollectionHistory = async (req, res) => {
  try {
    const collections = await Collection.find().sort({
      collectedAt: -1
    });

    res.status(200).json({
      success: true,
      count: collections.length,
      collections
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Get all notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      isRead: false
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Mark one notification as read
const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Mark all notifications as read
const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateBinLocation = async (req, res) => {
  try {
    const { location, latitude, longitude } = req.body;
    const { binId } = req.params;

    if (!location || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Location, latitude and longitude are required"
      });
    }

    const bin = await Bin.findOneAndUpdate(
      { binId },
      {
        $set: {
          location,
          latitude,
          longitude
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: "Bin not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Bin GPS location updated successfully",
      bin
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


module.exports = { getBins, getBinHistory ,updateBin , updateBinLocation, optimizeRoute , getBinPrediction , markBinCollected, getCollectionHistory, getNotifications,
markNotificationRead,
markAllNotificationsRead };
