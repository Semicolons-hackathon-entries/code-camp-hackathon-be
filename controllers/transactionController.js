const blockchainService = require("../services/blockchainService");
const Job = require("../models/Job");

const escrowPayment = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }

    if (job.clientId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only the client can escrow payment for this job");
    }

    if (job.paymentStatus === "Escrowed") {
      res.status(400);
      throw new Error("Payment is already escrowed");
    }

    if (job.paymentStatus === "Released") {
      res.status(400);
      throw new Error("Payment has already been released");
    }

    const transaction = await blockchainService.escrowPayment(job);

    res.status(200).json({ success: true, data: { job, transaction } });
  } catch (err) {
    next(err);
  }
};

const releasePayment = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }

    if (job.clientId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only the client can release payment for this job");
    }

    if (job.paymentStatus !== "Escrowed") {
      res.status(400);
      throw new Error("Payment must be escrowed before it can be released");
    }

    const transaction = await blockchainService.releasePayment(job);

    res.status(200).json({ success: true, data: { job, transaction } });
  } catch (err) {
    next(err);
  }
};

const getMyTransactions = async (req, res, next) => {
  try {
    const { type, page, limit } = req.query;
    const result = await blockchainService.getTransactionsByUser(req.user._id, {
      type,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getJobTransactions = async (req, res, next) => {
  try {
    const transactions = await blockchainService.getTransactionsByJob(
      req.params.jobId
    );
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  escrowPayment,
  releasePayment,
  getMyTransactions,
  getJobTransactions,
};
