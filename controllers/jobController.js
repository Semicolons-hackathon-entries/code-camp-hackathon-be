const jobService = require("../services/jobService");
const Worker = require("../models/Worker");

const createJob = async (req, res, next) => {
  try {
    const { workerId, description, serviceId, price } = req.body;

    if (!workerId || !description) {
      res.status(400);
      throw new Error("Please provide workerId and description");
    }

    const job = await jobService.createJobRequest(req.user._id, {
      workerId,
      description,
      serviceId,
      price,
      clientLocation: req.body.clientLocation,
    });

    // Notify worker in real-time
    const worker = await Worker.findById(workerId);
    if (worker) {
      const notifyUser = req.app.get("notifyUser");
      notifyUser(worker.userId, "new_job_request", job);
    }

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getJob = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getMyClientJobs = async (req, res, next) => {
  try {
    const jobs = await jobService.getJobsForClient(req.user._id);
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getMyWorkerJobs = async (req, res, next) => {
  try {
    const jobs = await jobService.getJobsForWorker(req.user._id);
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const respondToJob = async (req, res, next) => {
  try {
    const { action } = req.body;

    if (!action) {
      res.status(400);
      throw new Error("Please provide an action (accept or decline)");
    }

    const job = await jobService.respondToJob(req.user._id, req.params.id, action);

    // Notify client in real-time
    const notifyUser = req.app.get("notifyUser");
    const workerProfile = await Worker.findById(job.workerId._id || job.workerId);
    notifyUser(job.clientId._id || job.clientId, "job_response", {
      jobId: job._id,
      status: job.status,
      workerName: workerProfile ? workerProfile.name : null,
      workerRating: workerProfile ? workerProfile.rating : null,
      workerDescription: workerProfile ? workerProfile.serviceDescription : null,
    });

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const completeJob = async (req, res, next) => {
  try {
    const job = await jobService.completeJob(req.user._id, req.params.id);

    // Notify client in real-time
    const notifyUser = req.app.get("notifyUser");
    notifyUser(job.clientId._id || job.clientId, "job_completed", {
      jobId: job._id,
    });

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const emergencyRequest = async (req, res, next) => {
  try {
    const { longitude, latitude, skill, description } = req.body;

    if (!longitude || !latitude) {
      res.status(400);
      throw new Error("Please provide your longitude and latitude");
    }

    const job = await jobService.createEmergencyRequest(req.user._id, {
      longitude,
      latitude,
      skill,
      description,
    });

    // Notify matched worker in real-time
    const worker = await Worker.findById(job.workerId._id || job.workerId);
    if (worker) {
      const notifyUser = req.app.get("notifyUser");
      notifyUser(worker.userId, "emergency_job_request", job);
    }

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getPendingRequests = async (req, res, next) => {
  try {
    const jobs = await jobService.getPendingJobRequests(req.user._id);
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// Create a job from AI chatbox (no worker assigned yet - broadcast to all matching workers)
const createMatchmakingJob = async (req, res, next) => {
  try {
    const { title, description, category, aiSummary, clientLocation } = req.body;

    if (!description) {
      res.status(400);
      throw new Error("Please provide a description");
    }

    const Job = require("../models/Job");
    const jobData = {
      clientId: req.user._id,
      title: title || "Service Request",
      description,
      category,
      aiSummary,
      status: "Pending",
    };

    if (clientLocation && clientLocation.longitude != null && clientLocation.latitude != null) {
      jobData.clientLocation = {
        type: "Point",
        coordinates: [clientLocation.longitude, clientLocation.latitude],
      };
    }

    const job = await Job.create(jobData);

    // Find matching workers by skill and notify all of them
    const filter = { isAvailable: true };
    if (category) {
      filter.skills = { $in: [new RegExp(category, "i")] };
    }
    const workers = await Worker.find(filter);

    const notifyUser = req.app.get("notifyUser");
    workers.forEach((worker) => {
      notifyUser(worker.userId, "new_job_available", {
        jobId: job._id,
        title: job.title,
        description: job.description,
        category: job.category,
        createdAt: job.createdAt,
      });
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// First-to-accept: worker claims a pending job
const claimJob = async (req, res, next) => {
  try {
    const Job = require("../models/Job");
    const worker = await Worker.findOne({ userId: req.user._id });
    if (!worker) {
      res.status(404);
      throw new Error("Worker profile not found");
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
    if (job.status !== "Pending" || job.workerId) {
      res.status(400);
      throw new Error("Job is no longer available");
    }

    job.workerId = worker._id;
    job.status = "Accepted";
    await job.save();

    // Notify client
    const notifyUser = req.app.get("notifyUser");
    notifyUser(job.clientId, "job_accepted", {
      jobId: job._id,
      workerId: worker._id,
      workerName: worker.name,
      workerRating: worker.rating,
      workerDescription: worker.serviceDescription,
    });

    // Notify all workers that job is taken
    const io = req.app.get("io");
    if (io) io.emit("job_taken", { jobId: job._id });

    const populated = await Job.findById(job._id)
      .populate("clientId", "email name phone")
      .populate({ path: "workerId", populate: { path: "userId", select: "email name" } });

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// Update job status (worker side: OnTheWay, Arrived, InProgress, WorkDone)
const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const Job = require("../models/Job");
    const worker = await Worker.findOne({ userId: req.user._id });
    if (!worker) {
      res.status(404);
      throw new Error("Worker profile not found");
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
    if (job.workerId.toString() !== worker._id.toString()) {
      res.status(403);
      throw new Error("Not authorized");
    }

    const validTransitions = {
      Accepted: ["OnTheWay"],
      OnTheWay: ["Arrived"],
      Arrived: ["InProgress"],
      ClientConfirmed: ["Completed"],
    };

    const allowed = validTransitions[job.status];
    if (!allowed || !allowed.includes(status)) {
      res.status(400);
      throw new Error(`Cannot transition from ${job.status} to ${status}`);
    }

    job.status = status;
    await job.save();

    // Notify client
    const notifyUser = req.app.get("notifyUser");
    notifyUser(job.clientId, "job_status_update", {
      jobId: job._id,
      status,
    });

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// Upload proof photo
const uploadProof = async (req, res, next) => {
  try {
    const { photo, role } = req.body;
    const Job = require("../models/Job");

    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }

    if (role === "worker") {
      job.workerProofPhoto = photo;
    } else {
      job.clientProofPhoto = photo;
    }
    await job.save();

    const notifyUser = req.app.get("notifyUser");
    const targetId = role === "worker" ? job.clientId : job.workerId;
    if (targetId) {
      const targetUserId = role === "worker" ? job.clientId : (await Worker.findById(job.workerId))?.userId;
      if (targetUserId) {
        notifyUser(targetUserId, "proof_uploaded", { jobId: job._id, role });
      }
    }

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// Client confirms job done (only at InProgress stage)
const clientConfirmJob = async (req, res, next) => {
  try {
    const Job = require("../models/Job");
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
    if (job.clientId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized");
    }
    if (job.status !== "InProgress") {
      res.status(400);
      throw new Error("Job can only be confirmed when work is in progress");
    }

    job.status = "ClientConfirmed";
    await job.save();

    const notifyUser = req.app.get("notifyUser");
    const worker = await Worker.findById(job.workerId);
    if (worker) {
      notifyUser(worker.userId, "client_confirmed", { jobId: job._id });
    }

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// Client cancels a job request
const cancelJob = async (req, res, next) => {
  try {
    const Job = require("../models/Job");
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
    if (job.clientId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized");
    }

    if (job.status !== "Pending") {
      res.status(400);
      throw new Error("This job can no longer be cancelled");
    }

    const previousWorkerId = job.workerId;
    job.status = "Cancelled";
    await job.save();

    // Notify worker if one was assigned
    if (previousWorkerId) {
      const worker = await Worker.findById(previousWorkerId);
      if (worker) {
        const notifyUser = req.app.get("notifyUser");
        notifyUser(worker.userId, "job_cancelled", {
          jobId: job._id,
          title: job.title,
        });
      }
    }

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// Get all available jobs (for worker marketplace - unassigned pending jobs)
const getAvailableJobs = async (req, res, next) => {
  try {
    const Job = require("../models/Job");
    const jobs = await Job.find({ status: "Pending", workerId: null })
      .populate("clientId", "email name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJob, getJob, getMyClientJobs, getMyWorkerJobs, respondToJob, completeJob,
  emergencyRequest, getPendingRequests, createMatchmakingJob, claimJob,
  updateJobStatus, uploadProof, clientConfirmJob, getAvailableJobs, cancelJob,
};
