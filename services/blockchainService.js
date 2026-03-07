const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const Job = require("../models/Job");
const Review = require("../models/Review");
const Worker = require("../models/Worker");

const generateMockTxHash = () => {
  return "0x" + crypto.randomBytes(32).toString("hex");
};

const escrowPayment = async (job) => {
  const hash = generateMockTxHash();

  const transaction = await Transaction.create({
    jobId: job._id,
    fromUserId: job.clientId,
    toUserId: null,
    type: "escrow",
    amount: job.price,
    hash,
  });

  job.paymentStatus = "Escrowed";
  job.blockchainTxHash = hash;
  await job.save();

  return transaction;
};

const releasePayment = async (job) => {
  const worker = await Worker.findById(job.workerId);
  const hash = generateMockTxHash();

  const transaction = await Transaction.create({
    jobId: job._id,
    fromUserId: job.clientId,
    toUserId: worker.userId,
    type: "release",
    amount: job.price,
    hash,
  });

  job.paymentStatus = "Released";
  await job.save();

  return transaction;
};

const getTransactionsByUser = async (userId, { type, page = 1, limit = 20 } = {}) => {
  const query = {
    $or: [{ fromUserId: userId }, { toUserId: userId }],
  };
  if (type) query.type = type;

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "jobId",
        select: "serviceId",
        populate: { path: "serviceId", select: "category" },
      })
      .populate("fromUserId", "name")
      .populate("toUserId", "name"),
    Transaction.countDocuments(query),
  ]);

  // Get all jobIds from transactions to batch-fetch reviews
  const jobIds = transactions.map((tx) => tx.jobId?._id).filter(Boolean);
  const reviews = await Review.find({ jobId: { $in: jobIds } }).select(
    "jobId rating comment"
  );
  const reviewMap = {};
  for (const review of reviews) {
    reviewMap[review.jobId.toString()] = review;
  }

  const results = transactions.map((tx) => {
    const isFrom = tx.fromUserId?._id.toString() === userId.toString();
    const otherParty = isFrom ? tx.toUserId : tx.fromUserId;
    const review = tx.jobId ? reviewMap[tx.jobId._id.toString()] : null;

    return {
      hash: tx.hash,
      type: tx.type,
      name: otherParty?.name || null,
      comment: review?.comment || null,
      rating: review?.rating || null,
      amount: tx.amount,
      date: tx.createdAt,
      serviceType: tx.jobId?.serviceId?.category || null,
      status: tx.status,
    };
  });

  return { transactions: results, total, page, limit };
};

const getTransactionsByJob = async (jobId) => {
  const transactions = await Transaction.find({ jobId })
    .sort({ createdAt: 1 })
    .populate("fromUserId", "name")
    .populate("toUserId", "name");

  const review = await Review.findOne({ jobId }).select("rating comment");

  return transactions.map((tx) => ({
    hash: tx.hash,
    type: tx.type,
    fromName: tx.fromUserId?.name || null,
    toName: tx.toUserId?.name || null,
    comment: review?.comment || null,
    rating: review?.rating || null,
    amount: tx.amount,
    date: tx.createdAt,
    status: tx.status,
  }));
};

module.exports = {
  generateMockTxHash,
  escrowPayment,
  releasePayment,
  getTransactionsByUser,
  getTransactionsByJob,
};
