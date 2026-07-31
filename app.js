const express = require("express");

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const Database = require("better-sqlite3");

const app = express();


const db = new Database("tasks.db");

app.use(express.json());

db.prepare(`
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
)
`).run();

const row = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();

if (row.count === 0) {
    const insert = db.prepare(
        "INSERT INTO tasks (title, done) VALUES (?, ?)"
    );

    insert.run("Learn Express", 0);
    insert.run("Build CRUD API", 0);
    insert.run("Test with Swagger", 1);
}

const tasks = [
    {
        id: 1,
        title: "Buy Milk",
        done: false
    },
    {
        id: 2,
        title: "Study Express",
        done: true
    },
    {
        id: 3,
        title: "Finish Assignment",
        done: false
    }
];

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Task API",
            version: "1.0.0",
            description: "A simple CRUD API built with Express"
        },
        servers: [
            {
                url: "http://localhost:3000"
            }
        ]
    },
    apis: ["./app.js"]
};

const swaggerSpec = swaggerJsdoc(options);

app.get("/", (req, res) => {
    res.json({
        name: "Task API",
        version: "1.0",
        endpoints: ["/tasks"]
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Returns a list of tasks. Optionally filter by completion status or search by title.
 *     parameters:
 *       - in: query
 *         name: done
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter tasks by completion status.
 *
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search tasks by title.
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: Maximum number of tasks to return.
 *
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *         description: Number of tasks to skip before returning results.
 *
 *     responses:
 *       200:
 *         description: A list of tasks.
 */

app.get("/tasks", (req, res) => {

    const { done, search, limit, offset } = req.query;

    let filteredTasks = db.prepare("SELECT * FROM tasks").all();
    filteredTasks = filteredTasks.map(task => ({
    ...task,
    done: Boolean(task.done)
}));

    // Filter by completion status
    if (done !== undefined) {
        filteredTasks = filteredTasks.filter(
            task => task.done === (done === "true")
        );
    }

    // Search by title
    if (search) {
        filteredTasks = filteredTasks.filter(task =>
            task.title.toLowerCase().includes(search.toLowerCase())
        );
    }

    // Pagination
    const start = offset ? parseInt(offset) : 0;
    const end = limit ? start + parseInt(limit) : filteredTasks.length;

    const paginatedTasks = filteredTasks.slice(start, end);

    res.json(paginatedTasks);

});
/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Get task statistics
 *     description: Returns statistics about all tasks.
 *     responses:
 *       200:
 *         description: Task statistics returned successfully.
 */

app.get("/stats", (req, res) => {

    const total = tasks.length;

    const completed = tasks.filter(task => task.done).length;

    const pending = total - completed;

    res.json({
        total,
        completed,
        pending
    });

});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     description: Returns a single task by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task found.
 *       404:
 *         description: Task not found.
 */

app.get("/tasks/:id", (req, res) => {

    const taskId = parseInt(req.params.id);

    const task = db.prepare(
    "SELECT * FROM tasks WHERE id = ?"
).get(taskId);

if (task) {
    task.done = Boolean(task.done);
}

    if (!task) {
        return res.status(404).json({
            error: `Task ${taskId} not found`
        });
    }

    res.json(task);

});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     description: Creates a new task and stores it in the SQLite database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Learn SQLite
 *     responses:
 *       201:
 *         description: Task created successfully.
 *       400:
 *         description: Title is required.
 */

app.post("/tasks", (req, res) => {

    if (!req.body.title || req.body.title.trim() === "") {
    return res.status(400).json({
        error: "Title is required"
    });
}

    const result = db.prepare(
    "INSERT INTO tasks (title, done) VALUES (?, ?)"
).run(req.body.title, 0);

const newTask = {
    id: Number(result.lastInsertRowid),
    title: req.body.title,
    done: false
};

res.status(201).json(newTask);

});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     description: Updates an existing task.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Learn Node.js
 *               done:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Task updated successfully.
 *       400:
 *         description: Invalid request.
 *       404:
 *         description: Task not found.
 */

app.put("/tasks/:id", (req, res) => {

    const taskId = parseInt(req.params.id);

    const task = db.prepare(
    "SELECT * FROM tasks WHERE id = ?"
).get(taskId);

    if (!task) {
        return res.status(404).json({
            error: `Task ${taskId} not found`
        });
    }

    if (!req.body.title || req.body.title.trim() === "") {
    return res.status(400).json({
        error: "Title is required"
    });
}

   db.prepare(
    "UPDATE tasks SET title = ?, done = ? WHERE id = ?"
).run(
    req.body.title,
    req.body.done ? 1 : 0,
    taskId
);

const updatedTask = db.prepare(
    "SELECT * FROM tasks WHERE id = ?"
).get(taskId);

updatedTask.done = Boolean(updatedTask.done);

res.json(updatedTask);

});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Deletes a task by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Task deleted successfully.
 *       404:
 *         description: Task not found.
 */

app.delete("/tasks/:id", (req, res) => {

    const taskId = parseInt(req.params.id);

   const task = db.prepare(
    "SELECT * FROM tasks WHERE id = ?"
).get(taskId);

if (!task) {
    return res.status(404).json({
        error: `Task ${taskId} not found`
    });
}

db.prepare(
    "DELETE FROM tasks WHERE id = ?"
).run(taskId);

res.status(204).send();

});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});