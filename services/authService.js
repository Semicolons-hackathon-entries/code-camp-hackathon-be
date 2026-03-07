const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Worker = require("../models/Worker");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const signup = async ({ email, password, role }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw Object.assign(new Error("User already exists with this email"), {
      statusCode: 400,
    });
  }

  if (!["Client", "Worker"].includes(role)) {
    throw Object.assign(new Error("Role must be Client or Worker"), {
      statusCode: 400,
    });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({ email, passwordHash, role });

  return {
    _id: user._id,
    email: user.email,
    role: user.role,
    has_completed: user.has_completed === true,
    token: generateToken(user._id),
  };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw Object.assign(new Error("Invalid email or password"), {
      statusCode: 401,
    });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw Object.assign(new Error("Invalid email or password"), {
      statusCode: 401,
    });
  }

  const isOnboarded = user.has_completed === true;

  // For workers, also check if they have a worker profile
  let workerProfile = null;
  if (user.role === "Worker" && isOnboarded) {
    workerProfile = await Worker.findOne({ userId: user._id }).select("_id");
  }

  return {
    _id: user._id,
    email: user.email,
    role: user.role,
    name: user.name || null,
    has_completed: isOnboarded,
    workerId: workerProfile ? workerProfile._id : null,
    token: generateToken(user._id),
  };
};

const getProfile = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash");
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  const result = user.toObject();
  result.has_completed = result.has_completed === true;

  // Attach worker profile ID if applicable
  if (user.role === "Worker") {
    const worker = await Worker.findOne({ userId }).select("_id");
    result.workerId = worker ? worker._id : null;
  }

  return result;
};

const completeOnboarding = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  if (user.has_completed) {
    throw Object.assign(new Error("Onboarding already completed"), {
      statusCode: 400,
    });
  }

  // Shared fields for both roles
  if (!data.name) {
    throw Object.assign(new Error("Name is required"), { statusCode: 400 });
  }

  user.name = data.name;
  if (data.phone) user.phone = data.phone;
  if (data.location) {
    user.location = {
      type: "Point",
      coordinates: [data.location.longitude, data.location.latitude],
    };
  }

  // Worker-specific: also create the Worker profile
  let workerProfile = null;
  if (user.role === "Worker") {
    if (!data.skills || data.skills.length === 0) {
      throw Object.assign(new Error("Workers must provide at least one skill"), {
        statusCode: 400,
      });
    }

    workerProfile = await Worker.create({
      userId: user._id,
      name: data.name,
      skills: data.skills,
      serviceDescription: data.serviceDescription || "",
      location: data.location
        ? {
            type: "Point",
            coordinates: [data.location.longitude, data.location.latitude],
          }
        : undefined,
      isAvailable: true,
    });
  }

  user.has_completed = true;
  await user.save();

  const result = user.toObject();
  delete result.passwordHash;
  if (workerProfile) {
    result.workerProfile = workerProfile;
  }

  return result;
};

module.exports = { signup, login, getProfile, completeOnboarding };
