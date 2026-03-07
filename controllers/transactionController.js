const blockchainService = require("../services/blockchainService");

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
  getMyTransactions,
  getJobTransactions,
};
