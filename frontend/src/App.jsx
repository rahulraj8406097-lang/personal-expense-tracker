 import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const API_URL = "http://localhost:5000";

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#64748b",
];

function App() {
  const [page, setPage] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [transactions, setTransactions] = useState([]);

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState("2026-09-08");
  const [description, setDescription] = useState("");

  const [filter, setFilter] = useState("All");

  const [editingId, setEditingId] = useState(null);

  const [editData, setEditData] = useState({
    type: "expense",
    amount: "",
    category: "Food",
    date: "2026-09-08",
    description: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      setPage("dashboard");
      loadTransactions();
    }
  }, []);

  const register = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      alert("Registration successful! Please login.");

      setName("");
      setEmail("");
      setPassword("");

      setPage("login");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setEmail("");
      setPassword("");

      setPage("dashboard");

      await loadTransactions();

      alert("Login successful!");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_URL}/api/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load transactions"
        );
      }

      setTransactions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();

    if (!amount || !description) {
      alert("Please enter amount and description");
      return;
    }

    if (Number(amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      setPage("login");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/transactions`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            type,
            amount: Number(amount),
            category,
            date,
            description,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to add transaction"
        );
      }

      setTransactions((previous) => [
        data.transaction,
        ...previous,
      ]);

      setAmount("");
      setDescription("");

      alert("Transaction added successfully!");
    } catch (error) {
      alert(error.message);
    }
  };

  const startEdit = (transaction) => {
    setEditingId(transaction._id);

    setEditData({
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
      description: transaction.description,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);

    setEditData({
      type: "expense",
      amount: "",
      category: "Food",
      date: "2026-09-08",
      description: "",
    });
  };

  const updateTransaction = async (id) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      return;
    }

    if (
      !editData.amount ||
      !editData.description
    ) {
      alert("Please fill amount and description");
      return;
    }

    if (Number(editData.amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/transactions/${id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            type: editData.type,
            amount: Number(editData.amount),
            category: editData.category,
            date: editData.date,
            description: editData.description,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update transaction"
        );
      }

      setTransactions((previous) =>
        previous.map((transaction) =>
          transaction._id === id
            ? data.transaction
            : transaction
        )
      );

      cancelEdit();

      alert("Transaction updated successfully!");
    } catch (error) {
      alert(error.message);
    }
  };

  const deleteTransaction = async (id) => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      setPage("login");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/transactions/${id}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete transaction"
        );
      }

      setTransactions((previous) =>
        previous.filter(
          (transaction) =>
            transaction._id !== id
        )
      );

      alert("Transaction deleted successfully!");
    } catch (error) {
      alert(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setTransactions([]);

    setPage("login");

    alert("Logged out successfully!");
  };

  const totalIncome = transactions
    .filter(
      (item) => item.type === "income"
    )
    .reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );

  const totalExpense = transactions
    .filter(
      (item) => item.type === "expense"
    )
    .reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );

  const balance = totalIncome - totalExpense;

  const filteredTransactions =
    transactions.filter(
      (transaction) => {
        if (filter === "All") {
          return true;
        }

        if (filter === "Income") {
          return transaction.type === "income";
        }

        if (filter === "Expense") {
          return transaction.type === "expense";
        }

        return true;
      }
    );

  // ================================
  // CATEGORY-WISE EXPENSE DATA
  // ================================

  const categoryTotals = {};

  transactions
    .filter(
      (transaction) =>
        transaction.type === "expense"
    )
    .forEach((transaction) => {
      const categoryName =
        transaction.category || "Other";

      categoryTotals[categoryName] =
        (categoryTotals[categoryName] || 0) +
        Number(transaction.amount);
    });

  const chartData = Object.entries(
    categoryTotals
  ).map(([name, value]) => ({
    name,
    value,
  }));

  // ================================
  // REGISTER PAGE
  // ================================

  if (page === "register") {
    return (
      <div className="auth-page">

        <div className="auth-card">

          <h1>Expense Tracker</h1>

          <p>Create your account</p>

          <form onSubmit={register}>

            <label>Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <button
              className="add-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Register"}
            </button>

          </form>

          <p className="auth-switch">
            Already have an account?
          </p>

          <button
            className="secondary-btn"
            onClick={() =>
              setPage("login")
            }
          >
            Login
          </button>

        </div>

      </div>
    );
  }

  // ================================
  // LOGIN PAGE
  // ================================

  if (page === "login") {
    return (
      <div className="auth-page">

        <div className="auth-card">

          <h1>Expense Tracker</h1>

          <p>
            Login to manage your expenses
          </p>

          <form onSubmit={login}>

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            <button
              className="add-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          <p className="auth-switch">
            Don't have an account?
          </p>

          <button
            className="secondary-btn"
            onClick={() =>
              setPage("register")
            }
          >
            Create Account
          </button>

        </div>

      </div>
    );
  }

  // ================================
  // DASHBOARD
  // ================================

  return (
    <div className="app">

      <header className="header">

        <div>
          <h1>Expense Tracker</h1>

          <p>
            Manage your income and expenses easily
          </p>
        </div>

        <button
          className="logout-btn"
          onClick={logout}
        >
          Logout
        </button>

      </header>

      <main className="container">

        {/* SUMMARY */}

        <section className="summary-grid">

          <div className="summary-card income">

            <span>Total Income</span>

            <h2>
              ₹{totalIncome.toLocaleString()}
            </h2>

          </div>

          <div className="summary-card expense">

            <span>Total Expense</span>

            <h2>
              ₹{totalExpense.toLocaleString()}
            </h2>

          </div>

          <div className="summary-card balance">

            <span>Remaining Balance</span>

            <h2>
              ₹{balance.toLocaleString()}
            </h2>

          </div>

        </section>

        {/* ADD + TRANSACTIONS */}

        <section className="content-grid">

          {/* ADD TRANSACTION */}

          <div className="card">

            <h2>Add Transaction</h2>

            <form onSubmit={addTransaction}>

              <label>
                Transaction Type
              </label>

              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value)
                }
              >

                <option value="expense">
                  Expense
                </option>

                <option value="income">
                  Income
                </option>

              </select>

              <label>
                Amount
              </label>

              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
              />

              <label>
                Category
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
              >

                <option>Food</option>
                <option>Shopping</option>
                <option>Travel</option>
                <option>Bills</option>
                <option>Entertainment</option>
                <option>Salary</option>
                <option>Other</option>

              </select>

              <label>
                Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
              />

              <label>
                Description
              </label>

              <input
                type="text"
                placeholder="Short description"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
              />

              <button
                className="add-btn"
                type="submit"
              >
                Add Transaction
              </button>

            </form>

          </div>

          {/* TRANSACTIONS */}

          <div className="card transactions-card">

            <div className="transaction-header">

              <div>

                <h2>Transactions</h2>

                <p>
                  Recent financial activity
                </p>

              </div>

              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value)
                }
              >

                <option>All</option>
                <option>Income</option>
                <option>Expense</option>

              </select>

            </div>

            <div className="transaction-list">

              {filteredTransactions.length ===
              0 ? (

                <p>
                  No transactions found.
                </p>

              ) : (

                filteredTransactions.map(
                  (transaction) => (

                    <div
                      className="transaction"
                      key={transaction._id}
                    >

                      {editingId ===
                      transaction._id ? (

                        <div className="edit-form">

                          <h3>
                            Edit Transaction
                          </h3>

                          <select
                            value={
                              editData.type
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                type: e.target.value,
                              })
                            }
                          >

                            <option value="expense">
                              Expense
                            </option>

                            <option value="income">
                              Income
                            </option>

                          </select>

                          <input
                            type="number"
                            value={
                              editData.amount
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                amount: e.target.value,
                              })
                            }
                          />

                          <select
                            value={
                              editData.category
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                category: e.target.value,
                              })
                            }
                          >

                            <option>Food</option>
                            <option>Shopping</option>
                            <option>Travel</option>
                            <option>Bills</option>
                            <option>
                              Entertainment
                            </option>
                            <option>Salary</option>
                            <option>Other</option>

                          </select>

                          <input
                            type="date"
                            value={
                              editData.date
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                date: e.target.value,
                              })
                            }
                          />

                          <input
                            type="text"
                            value={
                              editData.description
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                description:
                                  e.target.value,
                              })
                            }
                          />

                          <div className="edit-actions">

                            <button
                              className="add-btn"
                              onClick={() =>
                                updateTransaction(
                                  transaction._id
                                )
                              }
                            >
                              Save Changes
                            </button>

                            <button
                              className="secondary-btn"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>

                          </div>

                        </div>

                      ) : (

                        <>

                          <div>

                            <h3>
                              {
                                transaction.description
                              }
                            </h3>

                            <p>
                              {
                                transaction.category
                              }{" "}
                              •{" "}
                              {transaction.date}
                            </p>

                          </div>

                          <div className="transaction-right">

                            <strong
                              className={
                                transaction.type ===
                                "income"
                                  ? "income-text"
                                  : "expense-text"
                              }
                            >

                              {transaction.type ===
                              "income"
                                ? "+"
                                : "-"}

                              ₹
                              {Number(
                                transaction.amount
                              ).toLocaleString()}

                            </strong>

                            <button
                              className="edit-btn"
                              onClick={() =>
                                startEdit(
                                  transaction
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() =>
                                deleteTransaction(
                                  transaction._id
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </>

                      )}

                    </div>

                  )
                )

              )}

            </div>

          </div>

        </section>

        {/* ================================
            EXPENSE CHART
        ================================= */}

        <section className="card chart-card">

          <div className="chart-header">

            <div>
              <h2>Expense Breakdown</h2>

              <p>
                Category-wise expense summary
              </p>
            </div>

          </div>

          {chartData.length === 0 ? (

            <div className="no-chart-data">

              <div className="chart-icon">
                📊
              </div>

              <h3>No expense data yet</h3>

              <p>
                Add some expense transactions
                to see your category breakdown.
              </p>

            </div>

          ) : (

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={350}
              >

                <PieChart>

                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={55}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >

                    {chartData.map(
                      (entry, index) => (

                        <Cell
                          key={`cell-${index}`}
                          fill={
                            CHART_COLORS[
                              index %
                                CHART_COLORS.length
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip
                    formatter={(value) =>
                      `₹${Number(
                        value
                      ).toLocaleString()}`
                    }
                  />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default App;