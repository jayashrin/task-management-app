const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.log(error));

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },
  password: String
});

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: {
    type: String,
    default: "Pending"
  },
  userId: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.json({
      message: "Registration successful"
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
});

// Authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "Access denied"
    });
  }

  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );

    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid token"
    });
  }
}

// Get tasks
app.get("/api/tasks", authenticate, async (req, res) => {
  const tasks = await Task.find({
    userId: req.userId
  });

  res.json(tasks);
});

// Create task
app.post("/api/tasks", authenticate, async (req, res) => {
  const { title, description, status } = req.body;

  const task = await Task.create({
    title,
    description,
    status,
    userId: req.userId
  });

  res.json(task);
});
// Get single task
app.get("/api/tasks/:id", authenticate, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json(task);

  } catch (error) {
    console.error("Get task error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
});
// Update task
app.put("/api/tasks/:id", authenticate, async (req, res) => {
  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.userId
    },
    req.body,
    { new: true }
  );

  res.json(task);
});

// Delete task
app.delete("/api/tasks/:id", authenticate, async (req, res) => {
  await Task.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId
  });

  res.json({
    message: "Task deleted"
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});