const Message = require("../models/Message");
const Job = require("../models/Job");
const Worker = require("../models/Worker");

const validateJobParticipant = async (jobId, userId) => {
  const job = await Job.findById(jobId).populate("workerId", "userId");
  if (!job) {
    throw Object.assign(new Error("Job not found"), { statusCode: 404 });
  }

  const isClient = job.clientId.toString() === userId.toString();
  const isWorker = job.workerId && job.workerId.userId
    ? job.workerId.userId.toString() === userId.toString()
    : false;

  if (!isClient && !isWorker) {
    throw Object.assign(new Error("Not a participant in this job"), {
      statusCode: 403,
    });
  }

  if (job.status === "Declined") {
    throw Object.assign(new Error("Chat is not available for declined jobs"), {
      statusCode: 400,
    });
  }

  return { job, isClient, isWorker };
};

const sendMessage = async (jobId, senderId, content) => {
  const { job } = await validateJobParticipant(jobId, senderId);

  // Figure out the receiver
  const isClient = job.clientId.toString() === senderId.toString();
  const receiverId = isClient
    ? (job.workerId && job.workerId.userId ? job.workerId.userId : null)
    : job.clientId;

  if (!receiverId) {
    throw Object.assign(new Error("No worker assigned to this job yet"), {
      statusCode: 400,
    });
  }

  const message = await Message.create({
    jobId,
    senderId,
    receiverId,
    content,
  });

  return message.populate([
    { path: "senderId", select: "email" },
    { path: "receiverId", select: "email" },
  ]);
};

const getMessages = async (jobId, userId, { page = 1, limit = 50 } = {}) => {
  await validateJobParticipant(jobId, userId);

  const skip = (page - 1) * limit;

  const messages = await Message.find({ jobId })
    .populate("senderId", "email")
    .populate("receiverId", "email")
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({ jobId });

  return { messages, total, page, limit };
};

const markAsRead = async (jobId, userId) => {
  await validateJobParticipant(jobId, userId);

  const result = await Message.updateMany(
    { jobId, receiverId: userId, readAt: null },
    { readAt: new Date() }
  );

  return { markedRead: result.modifiedCount };
};

const getUnreadCount = async (userId) => {
  const count = await Message.countDocuments({
    receiverId: userId,
    readAt: null,
  });
  return { unread: count };
};

module.exports = {
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCount,
  validateJobParticipant,
};
