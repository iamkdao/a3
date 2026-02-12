const express = require("express")
const path = require("path")
const Todo = require("./models/Todo");
const User = require("./models/User");
const cookieParser = require("cookie-parser");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config()

const app = express()

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))
app.use(cookieParser())

let todosCollection = []

const client = new MongoClient(process.env.ATLAS_URI)
async function connectDB() {
    await client.connect();
    const db = client.db(process.env.DB_NAME);

    todosCollection = db.collection("todos");

    console.log("Connected to MongoDB");
}

connectDB().catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
});

const auth = function (req, res, next) {
    const username = req.cookies?.currentUser || req.headers["currentuser"]

    if (!username) {
        if (req.path.startsWith("/api/")) {
            return res.status(401).json({ error: "Not logged in. Access denied." });
        }
        return res.redirect("/login")
    }
    req.username = username
    next()
}

app.get("/", auth, (req, res) => {
    if (req.cookies?.currentUser) return res.redirect("/index");
    return res.redirect("/login");
})

app.get("/index", auth, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
})

// Authentication
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"))
})

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signup.html"))
})


// Data retrieval
app.get("/api/data", auth, async (req, res) => {
    try {
        const todos = await todosCollection.find({ userId: req.username }).toArray()
        res.json(todos);
    }
    catch (err) {
        res.status(500).json({ error: "Can't fetch todos" })
    }
})

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
    )

    await todosCollection.insertOne(todo)

    res.status(200).send("OK");
})

app.delete(`/api/data/:id`, auth, async (req, res) => {
    try {
        await todosCollection.deleteOne({
            _id: new ObjectId(req.params.id),
            userId: req.username
        })
        res.sendStatus(204)
    }
    catch {
        res.status(400).json({ error: "Failed to create todo" });
    }
})

app.put("/api/data/:id", auth, async (req, res) => {
    try {
        const deadline = new Date(req.body.deadline);
        const diffMs = deadline - new Date(req.body.date);
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const update = {
            $set: {
                task: req.body.task,
                desc: req.body.desc,
                priority: req.body.priority,
                deadlineDate: req.body.deadline,
                deadline: diffDays,
                date: req.body.date
            }
        };

        await todosCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            update
        )

        res.sendStatus(200);
    }
    catch {
        res.status(400).json({ error: "Invalid ID or update failed" });
    }
});

app.post("/api/session", (req, res) => {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: "username required" });

    // Simple assignment cookie (not encrypted); enough for this course spec
    res.cookie("currentUser", username, {
        httpOnly: true,
        sameSite: "lax",
    });

    res.sendStatus(204);
});

app.delete("/api/session", (req, res) => {
    res.clearCookie("currentUser");
    res.sendStatus(204);
});

app.get("/api/session", (req, res) => {
    const username = req.cookies?.currentUser || null;
    res.json({ username });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server listening on port " + PORT);
});