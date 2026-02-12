// server.js (ONE ORIGIN ONLY: backend serves frontend + API)

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { MongoClient, ObjectId } = require("mongodb");
const Todo = require("./models/Todo");
require("dotenv").config();

const app = express();

// ✅ needed on Render so secure cookies work behind proxy
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

let todosCollection = [];
const client = new MongoClient(process.env.ATLAS_URI);

async function connectDB() {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    todosCollection = db.collection("todos");
    console.log("Connected to MongoDB");
}

connectDB().catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
});

const auth = (req, res, next) => {
    const username = req.cookies?.currentUser;

    if (!username) {
        if (req.path.startsWith("/api/")) {
            return res.status(401).json({ error: "Not logged in. Access denied." });
        }
        return res.redirect("/login");
    }

    req.username = username;
    next();
};

// Pages
app.get("/", (req, res) => {
    if (req.cookies?.currentUser) return res.redirect("/index");
    return res.redirect("/login");
});

app.get("/index", auth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// API: get todos (for this user)
app.get("/api/data", auth, async (req, res) => {
    try {
        const todos = await todosCollection.find({ userId: req.username }).toArray();
        res.json(todos);
    } catch {
        res.status(500).json({ error: "Can't fetch todos" });
    }
});

// API: create todo
app.post("/api/data", auth, async (req, res) => {
    const deadlineDate = new Date(req.body.deadline);
    const diffMs = deadlineDate - new Date(req.body.date);
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const todo = new Todo(
        req.body.task,
        req.body.desc,
        req.body.priority,
        req.body.deadline,
        diffDays,
        req.body.date,
        req.username
    );

    await todosCollection.insertOne(todo);
    res.status(200).send("OK");
});

// API: delete todo (only if belongs to this user)
app.delete("/api/data/:id", auth, async (req, res) => {
    try {
        await todosCollection.deleteOne({
            _id: new ObjectId(req.params.id),
            userId: req.username,
        });
        res.sendStatus(204);
    } catch {
        res.status(400).json({ error: "Failed to delete todo" });
    }
});

// API: update todo (only if belongs to this user)
app.put("/api/data/:id", auth, async (req, res) => {
    try {
        const deadline = new Date(req.body.deadline);
        const diffMs = deadline - new Date(req.body.date);
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        await todosCollection.updateOne(
            { _id: new ObjectId(req.params.id), userId: req.username },
            {
                $set: {
                    task: req.body.task,
                    desc: req.body.desc,
                    priority: req.body.priority,
                    deadlineDate: req.body.deadline,
                    deadline: diffDays,
                    date: req.body.date,
                },
            }
        );

        res.sendStatus(200);
    } catch {
        res.status(400).json({ error: "Invalid ID or update failed" });
    }
});

// Session: set cookie
app.post("/api/session", (req, res) => {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: "username required" });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("currentUser", username, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd, // ✅ required on Render HTTPS in production
    });

    res.sendStatus(204);
});

// Session: clear cookie
app.delete("/api/session", (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("currentUser", { sameSite: "lax", secure: isProd });
    res.sendStatus(204);
});

// Session: check cookie
app.get("/api/session", (req, res) => {
    res.json({ username: req.cookies?.currentUser || null });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on port " + PORT));
