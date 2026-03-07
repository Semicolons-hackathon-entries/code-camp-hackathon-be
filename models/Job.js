const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Declined", "Completed"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Escrowed", "Released"],
      default: "Unpaid",
    },
    blockchainTxHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
