const denkiService = require("../services/denkiService");
const Job = require("../models/Job");
const Worker = require("../models/Worker");

// POST /api/denki/chat
// Body: { messages: [...], longitude?, latitude? }
// Returns: { speechLines, phase, summary, category, urgency, recommendation? }
const chat = async (req, res, next) => {
  try {
    const { messages, excludeWorkerIds } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400);
      throw new Error("Please provide a messages array");
    }

    const result = await denkiService.chat(messages);

    // When we reach summarizing or ready, proactively find matching workers by skill
    if (
      (result.phase === "summarizing" || result.phase === "ready") &&
      result.category
    ) {
      const workers = await denkiService.findMatchingWorkers(result.category, excludeWorkerIds || []);

      if (workers.length > 0) {
        const best = workers[0];
        result.recommendation = {
          worker: best,
          allWorkers: workers,
        };

        // If summarizing, add a speech line about the recommended worker
        if (result.phase === "summarizing" && best.name) {
          const ratingText =
            best.rating > 0
              ? `, rated ${best.rating} out of 5`
              : "";
          result.speechLines.push(
            `I found ${best.name}${ratingText}. They'd be a great fit for this.`
          );
        }
      }
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// POST /api/denki/match
// Body: { category, summary, urgency, workerId?, longitude?, latitude? }
// Creates a job and assigns the worker
const match = async (req, res, next) => {
  try {
    const { category, summary, urgency, workerId, excludeWorkerIds } = req.body;

    if (!category || !summary) {
      res.status(400);
      throw new Error("Category and summary are required");
    }

    // If no specific worker was chosen, find the best one by skill
    let assignedWorkerId = workerId;
    let assignedWorker = null;

    if (!assignedWorkerId) {
      const workers = await denkiService.findMatchingWorkers(category);
      if (workers.length > 0) {
        assignedWorkerId = workers[0]._id;
        assignedWorker = workers[0];
      }
    } else {
      // Look up the specific worker so we can return their info
      assignedWorker = await Worker.findById(assignedWorkerId);
    }

    const jobData = {
      clientId: req.user._id,
      description: summary,
      title: `${category} Service Request`,
      category,
      price: 0,
      isEmergency: urgency === "high",
      aiSummary: summary,
    };

    if (assignedWorkerId) {
      jobData.workerId = assignedWorkerId;
    }

    const job = await Job.create(jobData);

    // Notify assigned worker via Socket.IO
    if (assignedWorkerId) {
      const worker = await Worker.findById(assignedWorkerId);
      if (worker) {
        const notifyUser = req.app.get("notifyUser");
        if (notifyUser) {
          notifyUser(worker.userId.toString(), "new_job_request", {
            jobId: job._id,
            title: jobData.title,
            description: summary,
            category,
            urgency,
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        job: {
          _id: job._id,
          title: job.title,
          description: job.description,
          category: job.category,
          status: job.status,
        },
        bestMatch: assignedWorker
          ? { _id: assignedWorker._id, name: assignedWorker.name, rating: assignedWorker.rating }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { chat, match };
