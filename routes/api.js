const express = require("express");
const router = express.Router();

const helloController = require("../controllers/helloController");
const authController = require("../controllers/authController");
const workerController = require("../controllers/workerController");
const { protect, authorize } = require("../middleware/auth");

// Health check
router.get("/hello", helloController.sayHello);

// Auth routes (public)
router.post("/auth/signup", authController.signup);
router.post("/auth/login", authController.login);

// Auth routes (protected)
router.get("/auth/profile", protect, authController.getProfile);

// Worker routes (public)
router.get("/workers", workerController.getAll);
router.get("/workers/nearby", workerController.getNearby);

// Worker routes (protected - Worker role only)
router.post(
  "/workers/profile",
  protect,
  authorize("Worker"),
  workerController.createProfile
);
router.get(
  "/workers/profile",
  protect,
  authorize("Worker"),
  workerController.getMyProfile
);
router.put(
  "/workers/profile",
  protect,
  authorize("Worker"),
  workerController.updateProfile
);

module.exports = router;