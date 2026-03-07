const mongoose = require("mongoose");
const Worker = require("../models/Worker");
const Review = require("../models/Review");
const Job = require("../models/Job");
const Service = require("../models/Service");

const createWorkerProfile = async (userId, data) => {
  const existing = await Worker.findOne({ userId });
  if (existing) {
    throw Object.assign(new Error("Worker profile already exists"), {
      statusCode: 400,
    });
  }

  const worker = await Worker.create({
    userId,
    name: data.name,
    skills: data.skills || [],
    serviceDescription: data.serviceDescription || "",
    location: data.location
      ? {
          type: "Point",
          coordinates: [data.location.longitude, data.location.latitude],
        }
      : undefined,
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
  });

  return worker;
};

const getWorkerProfile = async (userId) => {
  const worker = await Worker.findOne({ userId }).populate(
    "userId",
    "email role"
  );
  if (!worker) {
    throw Object.assign(new Error("Worker profile not found"), {
      statusCode: 404,
    });
  }
  return worker;
};

const updateWorkerProfile = async (userId, data) => {
  const worker = await Worker.findOne({ userId });
  if (!worker) {
    throw Object.assign(new Error("Worker profile not found"), {
      statusCode: 404,
    });
  }

  if (data.name !== undefined) worker.name = data.name;
  if (data.skills !== undefined) worker.skills = data.skills;
  if (data.serviceDescription !== undefined)
    worker.serviceDescription = data.serviceDescription;
  if (data.location) {
    worker.location = {
      type: "Point",
      coordinates: [data.location.longitude, data.location.latitude],
    };
  }
  if (data.isAvailable !== undefined) worker.isAvailable = data.isAvailable;

  await worker.save();
  return worker;
};

const getNearbyWorkers = async (longitude, latitude, maxDistanceKm = 10) => {
  const workers = await Worker.find({
    isAvailable: true,
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceKm * 1000, // convert km to meters
      },
    },
  }).populate("userId", "email");

  return workers;
};

const getAllWorkers = async (filters = {}) => {
  const query = {};

  if (filters.skill) {
    query.skills = { $in: [filters.skill] };
  }
  if (filters.isAvailable !== undefined) {
    query.isAvailable = filters.isAvailable;
  }

  const workers = await Worker.find(query).populate("userId", "email role");
  return workers;
};

const getWorkerById = async (workerId) => {
  if (!mongoose.Types.ObjectId.isValid(workerId)) {
    throw Object.assign(new Error("Invalid worker ID"), { statusCode: 400 });
  }

  const worker = await Worker.findById(workerId).populate(
    "userId",
    "email role"
  );
  if (!worker) {
    throw Object.assign(new Error("Worker not found"), { statusCode: 404 });
  }
  return worker;
};

const findNearestWorker = async (longitude, latitude, skill) => {
  const query = {
    isAvailable: true,
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
    },
  };

  if (skill) {
    query.skills = { $in: [skill] };
  }

  const worker = await Worker.findOne(query).populate("userId", "email");

  if (!worker) {
    throw Object.assign(new Error("No available workers found nearby"), {
      statusCode: 404,
    });
  }

  return worker;
};

const updateLocation = async (userId, longitude, latitude) => {
  const worker = await Worker.findOne({ userId });
  if (!worker) {
    throw Object.assign(new Error("Worker profile not found"), {
      statusCode: 404,
    });
  }

  worker.location = {
    type: "Point",
    coordinates: [longitude, latitude],
  };

  await worker.save();
  return worker;
};

const getWorkerReputationProfile = async (workerId) => {
  if (!mongoose.Types.ObjectId.isValid(workerId)) {
    throw Object.assign(new Error("Invalid worker ID"), { statusCode: 400 });
  }

  const worker = await Worker.findById(workerId).populate(
    "userId",
    "email role"
  );
  if (!worker) {
    throw Object.assign(new Error("Worker not found"), { statusCode: 404 });
  }

  const [reviewStats, completedJobs, services] = await Promise.all([
    Review.aggregate([
      { $match: { workerId: worker._id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]),
    Job.countDocuments({ workerId: worker._id, status: "Completed" }),
    Service.find({ workerId: worker._id }).select(
      "category title description price"
    ),
  ]);

  const averageRating =
    reviewStats.length > 0
      ? Math.round(reviewStats[0].averageRating * 10) / 10
      : 0;
  const totalReviews =
    reviewStats.length > 0 ? reviewStats[0].totalReviews : 0;

  if (worker.rating !== averageRating) {
    worker.rating = averageRating;
    await worker.save();
  }

  return {
    _id: worker._id,
    name: worker.name,
    skills: worker.skills,
    serviceDescription: worker.serviceDescription,
    location: worker.location,
    rating: averageRating,
    totalReviews,
    completedJobs,
    services,
    isAvailable: worker.isAvailable,
    user: worker.userId,
  };
};

module.exports = {
  createWorkerProfile,
  getWorkerProfile,
  updateWorkerProfile,
  getNearbyWorkers,
  getAllWorkers,
  getWorkerById,
  findNearestWorker,
  updateLocation,
  getWorkerReputationProfile,
};
