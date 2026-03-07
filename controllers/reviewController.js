const Review = require("../models/Review");
const Worker = require("../models/Worker");
const Job = require("../models/Job");

const createReview = async (req, res, next) => {
  try {
    const { jobId, rating, comment } = req.body;

    if (!jobId || !rating) {
      res.status(400);
      throw new Error("Please provide jobId and rating");
    }

    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }

    if (job.clientId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only the client can review this job");
    }

    const existing = await Review.findOne({ jobId });
    if (existing) {
      res.status(400);
      throw new Error("Already reviewed this job");
    }

    const review = await Review.create({
      jobId,
      clientId: req.user._id,
      workerId: job.workerId,
      rating,
      comment,
    });

    // Update worker average rating
    const worker = await Worker.findById(job.workerId);
    if (worker) {
      const allReviews = await Review.find({ workerId: job.workerId });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      worker.rating = Math.round(avgRating * 10) / 10;
      await worker.save();
    }

    // Mark job as completed
    job.status = "Completed";
    job.paymentStatus = "Released";
    await job.save();

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getWorkerReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ workerId: req.params.workerId })
      .populate("clientId", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getWorkerReviews };
