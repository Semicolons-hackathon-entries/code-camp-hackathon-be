const express = require("express");
const router = express.Router();

const helloController = require("../controllers/helloController");
const authController = require("../controllers/authController");
const workerController = require("../controllers/workerController");
const jobController = require("../controllers/jobController");
const chatController = require("../controllers/chatController");
const aiController = require("../controllers/aiController");
const denkiController = require("../controllers/denkiController");
const reviewController = require("../controllers/reviewController");
const transactionController = require("../controllers/transactionController");
const { protect, authorize } = require("../middleware/auth");

// Health check
router.get("/hello", helloController.sayHello);

// Auth routes (public)
router.post("/auth/signup", authController.signup);
router.post("/auth/login", authController.login);

// Auth routes (protected)
router.get("/auth/profile", protect, authController.getProfile);
router.post("/auth/onboarding", protect, authController.completeOnboarding);

// Worker routes (public - static paths first)
router.get("/workers", workerController.getAll);
router.get("/workers/nearby", workerController.getNearby);

// Worker routes (protected - static paths before parameterized)
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
router.patch(
  "/workers/location",
  protect,
  authorize("Worker"),
  workerController.updateLocation
);

// Worker routes (public - parameterized paths last)
router.get("/workers/:id/reputation", workerController.getReputationProfile);
router.get("/workers/:id", workerController.getById);

// Job routes (protected)
router.post("/jobs", protect, authorize("Client"), jobController.createJob);
router.post("/jobs/emergency", protect, authorize("Client"), jobController.emergencyRequest);
router.get("/jobs/client", protect, authorize("Client"), jobController.getMyClientJobs);
router.get("/jobs/worker", protect, authorize("Worker"), jobController.getMyWorkerJobs);
router.get("/jobs/requests", protect, authorize("Worker"), jobController.getPendingRequests);
router.get("/jobs/:id", protect, jobController.getJob);
router.patch("/jobs/:id/respond", protect, authorize("Worker"), jobController.respondToJob);
router.patch("/jobs/:id/complete", protect, authorize("Worker"), jobController.completeJob);

// New job routes for matchmaking flow
router.post("/jobs/matchmaking", protect, authorize("Client"), jobController.createMatchmakingJob);
router.get("/jobs/available", protect, authorize("Worker"), jobController.getAvailableJobs);
router.patch("/jobs/:id/claim", protect, authorize("Worker"), jobController.claimJob);
router.patch("/jobs/:id/status", protect, authorize("Worker"), jobController.updateJobStatus);
router.patch("/jobs/:id/proof", protect, jobController.uploadProof);
router.patch("/jobs/:id/client-confirm", protect, authorize("Client"), jobController.clientConfirmJob);

// AI routes (protected)
router.post("/ai/analyze", protect, aiController.analyzeProblem);

// Denki AI agent routes (protected)
router.post("/denki/chat", protect, denkiController.chat);
router.post("/denki/match", protect, authorize("Client"), denkiController.match);

// Review routes
router.post("/reviews", protect, authorize("Client"), reviewController.createReview);
router.get("/reviews/worker/:workerId", reviewController.getWorkerReviews);

// Chat routes (protected)
router.post("/chat/:jobId/messages", protect, chatController.sendMessage);
router.get("/chat/:jobId/messages", protect, chatController.getMessages);
router.patch("/chat/:jobId/read", protect, chatController.markAsRead);
router.get("/chat/unread", protect, chatController.getUnreadCount);

// Transaction routes (protected)
router.get("/transactions", protect, transactionController.getMyTransactions);
router.get("/transactions/job/:jobId", protect, transactionController.getJobTransactions);

module.exports = router;