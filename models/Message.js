const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast chat history lookups
messageSchema.index({ jobId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
