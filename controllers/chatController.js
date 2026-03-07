const chatService = require("../services/chatService");

const sendMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const { jobId } = req.params;

    if (!content) {
      res.status(400);
      throw new Error("Please provide message content");
    }

    const message = await chatService.sendMessage(jobId, req.user._id, content);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const result = await chatService.getMessages(jobId, req.user._id, { page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const result = await chatService.markAsRead(jobId, req.user._id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const result = await chatService.getUnreadCount(req.user._id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { sendMessage, getMessages, markAsRead, getUnreadCount };
