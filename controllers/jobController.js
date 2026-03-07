const jobService = require("../services/jobService");
const Worker = require("../models/Worker");

const createJob = async (req, res, next) => {
  try {
    const { workerId, description, serviceId } = req.body;

    if (!workerId || !description) {
      res.status(400);
      throw new Error("Please provide workerId and description");
    }

    const job = await jobService.createJobRequest(req.user._id, {
      workerId,
      description,
      serviceId,
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
    notifyUser(job.clientId._id || job.clientId, "job_response", {
      jobId: job._id,
      status: job.status,
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

module.exports = { createJob, getJob, getMyClientJobs, getMyWorkerJobs, respondToJob, completeJob, emergencyRequest };
