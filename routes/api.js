const express = require("express");
const router = express.Router();

const helloController = require("../controllers/helloController");
const authController = require("../controllers/authController");
const workerController = require("../controllers/workerController");
const jobController = require("../controllers/jobController");
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
router.get("/workers/:id", workerController.getById);

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

// Job routes (protected)
router.post("/jobs", protect, authorize("Client"), jobController.createJob);
router.get("/jobs/client", protect, authorize("Client"), jobController.getMyClientJobs);
router.get("/jobs/worker", protect, authorize("Worker"), jobController.getMyWorkerJobs);
router.get("/jobs/:id", protect, jobController.getJob);
router.patch("/jobs/:id/respond", protect, authorize("Worker"), jobController.respondToJob);
router.patch("/jobs/:id/complete", protect, authorize("Worker"), jobController.completeJob);

module.exports = router;