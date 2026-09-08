 require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// =========================
// BASIC CONFIGURATION
// =========================

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// Check environment variables
console.log("MONGO_URI loaded:", !!MONGO_URI);
console.log("JWT_SECRET loaded:", !!JWT_SECRET);

if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI is missing from backend/.env");
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is missing from backend/.env");
  process.exit(1);
}

// =========================
// RATE LIMITER
// =========================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

// =========================
// HOME ROUTE
// =========================

app.get("/", (req, res) => {
  res.send("Expense Tracker API is running");
});

// =========================
// USER MODEL
// =========================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

// =========================
// TRANSACTION MODEL
// =========================

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

// =========================
// JWT MIDDLEWARE
// =========================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authentication token required",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Invalid authentication format",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

// =========================
// REGISTER
// =========================

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
});

// =========================
// LOGIN
// =========================

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});

// =========================
// GET ALL TRANSACTIONS
// =========================

app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user.userId,
    }).sort({
      date: -1,
      createdAt: -1,
    });

    res.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);

    res.status(500).json({
      message: "Failed to get transactions",
    });
  }
});

// =========================
// ADD TRANSACTION
// =========================

app.post("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      date,
      description,
    } = req.body;

    if (!type || !amount || !category || !date || !description) {
      return res.status(400).json({
        message: "All transaction fields are required",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Transaction type must be income or expense",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0",
      });
    }

    const transaction = await Transaction.create({
      userId: req.user.userId,
      type,
      amount: Number(amount),
      category,
      date,
      description,
    });

    res.status(201).json({
      message: "Transaction added successfully",
      transaction,
    });
  } catch (error) {
    console.error("Add transaction error:", error);

    res.status(500).json({
      message: "Failed to add transaction",
    });
  }
});

// =========================
// UPDATE TRANSACTION
// =========================

app.put(
  "/api/transactions/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        type,
        amount,
        category,
        date,
        description,
      } = req.body;

      const transaction = await Transaction.findOneAndUpdate(
        {
          _id: id,
          userId: req.user.userId,
        },
        {
          type,
          amount: Number(amount),
          category,
          date,
          description,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!transaction) {
        return res.status(404).json({
          message: "Transaction not found",
        });
      }

      res.json({
        message: "Transaction updated successfully",
        transaction,
      });
    } catch (error) {
      console.error("Update transaction error:", error);

      res.status(500).json({
        message: "Failed to update transaction",
      });
    }
  }
);

// =========================
// DELETE TRANSACTION
// =========================

app.delete(
  "/api/transactions/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const transaction = await Transaction.findOneAndDelete({
        _id: id,
        userId: req.user.userId,
      });

      if (!transaction) {
        return res.status(404).json({
          message: "Transaction not found",
        });
      }

      res.json({
        message: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error("Delete transaction error:", error);

      res.status(500).json({
        message: "Failed to delete transaction",
      });
    }
  }
);

// =========================
// TRANSACTION SUMMARY
// =========================

app.get(
  "/api/transactions/summary",
  authenticateToken,
  async (req, res) => {
    try {
      const transactions = await Transaction.find({
        userId: req.user.userId,
      });

      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach((transaction) => {
        if (transaction.type === "income") {
          totalIncome += transaction.amount;
        }

        if (transaction.type === "expense") {
          totalExpense += transaction.amount;
        }
      });

      const balance = totalIncome - totalExpense;

      res.json({
        totalIncome,
        totalExpense,
        balance,
      });
    } catch (error) {
      console.error("Summary error:", error);

      res.status(500).json({
        message: "Failed to get summary",
      });
    }
  }
);

// =========================
// DATABASE CONNECTION
// =========================

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:");
    console.error(error.message);
  });