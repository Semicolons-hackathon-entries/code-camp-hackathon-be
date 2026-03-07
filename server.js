require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const apiRoutes = require("./routes/api");
const errorHandler = require("./middleware/errorHandler");
const chatService = require("./services/chatService");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routes if needed
app.set("io", io);

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// Track online users: userId -> socketId
const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);
  console.log(`User connected: ${userId}`);

  // Join a job chat room
  socket.on("join_chat", (jobId) => {
    socket.join(`chat:${jobId}`);
    console.log(`User ${userId} joined chat:${jobId}`);
  });

  // Leave a job chat room
  socket.on("leave_chat", (jobId) => {
    socket.leave(`chat:${jobId}`);
  });

  // Send a message in a job chat
  socket.on("send_message", async ({ jobId, content }, callback) => {
    try {
      const message = await chatService.sendMessage(jobId, userId, content);

      // Broadcast to everyone in the chat room (including sender)
      io.to(`chat:${jobId}`).emit("new_message", message);

      // Also notify receiver directly if they're online but not in the room
      const receiverId = message.receiverId._id.toString();
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("message_notification", {
          jobId,
          message,
        });
      }

      if (callback) callback({ success: true, data: message });
    } catch (error) {
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Mark messages as read
  socket.on("mark_read", async ({ jobId }, callback) => {
    try {
      const result = await chatService.markAsRead(jobId, userId);
      io.to(`chat:${jobId}`).emit("messages_read", { jobId, userId });
      if (callback) callback({ success: true, data: result });
    } catch (error) {
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Typing indicators
  socket.on("typing", ({ jobId }) => {
    socket.to(`chat:${jobId}`).emit("user_typing", { jobId, userId });
  });

  socket.on("stop_typing", ({ jobId }) => {
    socket.to(`chat:${jobId}`).emit("user_stop_typing", { jobId, userId });
  });

  // Worker location update (real-time broadcast)
  socket.on("update_location", ({ longitude, latitude }) => {
    socket.broadcast.emit("worker_location_update", {
      userId,
      longitude,
      latitude,
    });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    console.log(`User disconnected: ${userId}`);
  });
});

// Helper: emit job notification to a specific user
app.set("notifyUser", (userId, event, data) => {
  const socketId = onlineUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
});

// Routes
app.get("/", (req, res) => {
  res.send("Code Camp Hackathon Backend Running");
});
app.use("/api", apiRoutes);

// Error handler (must be last)
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});