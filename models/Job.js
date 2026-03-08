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
      default: null,
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
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    clientLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined,
      },
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    aiSummary: {
      type: String,
      trim: true,
    },
    workerProofPhoto: {
      type: String,
      default: null,
    },
    clientProofPhoto: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Declined", "Cancelled", "OnTheWay", "Arrived", "InProgress", "WorkDone", "ClientConfirmed", "Completed"],
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
