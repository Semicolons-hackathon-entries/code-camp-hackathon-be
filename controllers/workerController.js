const workerService = require("../services/workerService");

const createProfile = async (req, res, next) => {
  try {
    const { name, skills, serviceDescription, location, isAvailable } =
      req.body;

    if (!name) {
      res.status(400);
      throw new Error("Please provide a name");
    }

    const worker = await workerService.createWorkerProfile(req.user._id, {
      name,
      skills,
      serviceDescription,
      location,
      isAvailable,
    });

    res.status(201).json({ success: true, data: worker });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const worker = await workerService.getWorkerProfile(req.user._id);
    res.status(200).json({ success: true, data: worker });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const worker = await workerService.updateWorkerProfile(
      req.user._id,
      req.body
    );
    res.status(200).json({ success: true, data: worker });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getNearby = async (req, res, next) => {
  try {
    const { longitude, latitude, distance } = req.query;

    if (!longitude || !latitude) {
      res.status(400);
      throw new Error("Please provide longitude and latitude");
    }

    const workers = await workerService.getNearbyWorkers(
      parseFloat(longitude),
      parseFloat(latitude),
      distance ? parseFloat(distance) : 10
    );

    res.status(200).json({ success: true, count: workers.length, data: workers });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.skill) filters.skill = req.query.skill;
    if (req.query.isAvailable !== undefined)
      filters.isAvailable = req.query.isAvailable === "true";

    const workers = await workerService.getAllWorkers(filters);
    res.status(200).json({ success: true, count: workers.length, data: workers });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const worker = await workerService.getWorkerById(req.params.id);
    res.status(200).json({ success: true, data: worker });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const { longitude, latitude } = req.body;

    if (longitude === undefined || latitude === undefined) {
      res.status(400);
      throw new Error("Please provide longitude and latitude");
    }

    const worker = await workerService.updateLocation(
      req.user._id,
      parseFloat(longitude),
      parseFloat(latitude)
    );

    res.status(200).json({ success: true, data: worker });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = { createProfile, getMyProfile, updateProfile, getNearby, getAll, getById, updateLocation };
