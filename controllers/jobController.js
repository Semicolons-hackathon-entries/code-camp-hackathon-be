const jobService = require("../services/jobService");

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
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const completeJob = async (req, res, next) => {
  try {
    const job = await jobService.completeJob(req.user._id, req.params.id);
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { createJob, getJob, getMyClientJobs, getMyWorkerJobs, respondToJob, completeJob };
