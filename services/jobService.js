const Job = require("../models/Job");
const Worker = require("../models/Worker");
const workerService = require("./workerService");

const createJobRequest = async (clientId, { workerId, description, serviceId }) => {
  const worker = await Worker.findById(workerId);
  if (!worker) {
    throw Object.assign(new Error("Worker not found"), { statusCode: 404 });
  }

  if (!worker.isAvailable) {
    throw Object.assign(new Error("Worker is not currently available"), {
      statusCode: 400,
    });
  }

  const job = await Job.create({
    clientId,
    workerId,
    description,
    serviceId: serviceId || null,
  });

  return job.populate([
    { path: "clientId", select: "email" },
    { path: "workerId", populate: { path: "userId", select: "email" } },
  ]);
};

const getJobById = async (jobId) => {
  const job = await Job.findById(jobId)
    .populate("clientId", "email")
    .populate({
      path: "workerId",
      populate: { path: "userId", select: "email" },
    })
    .populate("serviceId");

  if (!job) {
    throw Object.assign(new Error("Job not found"), { statusCode: 404 });
  }
  return job;
};

const getJobsForClient = async (clientId) => {
  return Job.find({ clientId })
    .populate({
      path: "workerId",
      select: "name skills rating",
      populate: { path: "userId", select: "email" },
    })
    .populate("serviceId", "title price")
    .sort({ createdAt: -1 });
};

const getJobsForWorker = async (userId) => {
  const worker = await Worker.findOne({ userId });
  if (!worker) {
    throw Object.assign(new Error("Worker profile not found"), {
      statusCode: 404,
    });
  }

  return Job.find({ workerId: worker._id })
    .populate("clientId", "email")
    .populate("serviceId", "title price")
    .sort({ createdAt: -1 });
};

const respondToJob = async (userId, jobId, action) => {
  const worker = await Worker.findOne({ userId });
  if (!worker) {
    throw Object.assign(new Error("Worker profile not found"), {
      statusCode: 404,
    });
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw Object.assign(new Error("Job not found"), { statusCode: 404 });
  }

  if (job.workerId.toString() !== worker._id.toString()) {
    throw Object.assign(new Error("Not authorized to respond to this job"), {
      statusCode: 403,
    });
  }

  if (job.status !== "Pending") {
    throw Object.assign(
      new Error(`Job has already been ${job.status.toLowerCase()}`),
      { statusCode: 400 }
    );
  }

  if (action === "accept") {
    job.status = "Accepted";
  } else if (action === "decline") {
    job.status = "Declined";
  } else {
    throw Object.assign(new Error("Action must be 'accept' or 'decline'"), {
      statusCode: 400,
    });
  }

  await job.save();

  return job.populate([
    { path: "clientId", select: "email" },
    { path: "workerId", populate: { path: "userId", select: "email" } },
  ]);
};

const completeJob = async (userId, jobId) => {
  const worker = await Worker.findOne({ userId });
  if (!worker) {
    throw Object.assign(new Error("Worker profile not found"), {
      statusCode: 404,
    });
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw Object.assign(new Error("Job not found"), { statusCode: 404 });
  }

  if (job.workerId.toString() !== worker._id.toString()) {
    throw Object.assign(new Error("Not authorized to complete this job"), {
      statusCode: 403,
    });
  }

  if (job.status !== "Accepted") {
    throw Object.assign(new Error("Only accepted jobs can be completed"), {
      statusCode: 400,
    });
  }

  job.status = "Completed";
  await job.save();

  return job.populate([
    { path: "clientId", select: "email" },
    { path: "workerId", populate: { path: "userId", select: "email" } },
  ]);
};

const createEmergencyRequest = async (clientId, { longitude, latitude, skill, description }) => {
  const worker = await workerService.findNearestWorker(longitude, latitude, skill);

  const job = await Job.create({
    clientId,
    workerId: worker._id,
    description: description || `Emergency ${skill || "service"} request`,
    isEmergency: true,
  });

  return job.populate([
    { path: "clientId", select: "email" },
    { path: "workerId", populate: { path: "userId", select: "email" } },
  ]);
};

module.exports = {
  createJobRequest,
  getJobById,
  getJobsForClient,
  getJobsForWorker,
  respondToJob,
  completeJob,
  createEmergencyRequest,
};
