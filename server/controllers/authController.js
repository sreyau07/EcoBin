
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Login Admin or Collection Worker
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password"
      });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

const createWorker = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters"
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    const worker = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "worker"
    });

    await worker.save();

    res.status(201).json({
      success: true,
      message: "Collection Worker created successfully",
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        role: worker.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated"
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const createWorker = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters"
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    const worker = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "worker"
    });

    await worker.save();

    res.status(201).json({
      success: true,
      message: "Collection Worker created successfully",
      worker: {
        id: worker._id,
        name: worker.name,
        email: worker.email,
        role: worker.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: "worker" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: workers.length,
      workers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateWorkerStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const worker = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "worker"
      },
      { isActive },
      { new: true }
    ).select("-password");

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Worker ${isActive ? "activated" : "deactivated"} successfully`,
      worker
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
module.exports = { loginUser, createWorker,  getWorkers, updateWorkerStatus };
