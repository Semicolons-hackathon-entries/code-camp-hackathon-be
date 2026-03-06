require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const apiRoutes = require("./routes/api");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Code Camp Hackathon Backend Running");
});
app.use("/api", apiRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});