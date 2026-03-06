const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

  return {
    _id: user._id,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
  };
};

const getProfile = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash");
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }
  return user;
};

module.exports = { signup, login, getProfile };
