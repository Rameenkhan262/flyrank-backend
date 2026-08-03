const express = require("express");

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");



const pool = require("./db");

const app = express();




app.use(express.json());



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

app.get("/tasks", async (req, res) => {

    const { done, search, limit, offset } = req.query;

    const result = await pool.query("SELECT * FROM tasks");

    let filteredTasks = result.rows;

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

app.get("/stats", async (req, res) => {

    const totalResult = await pool.query(
        "SELECT COUNT(*) FROM tasks"
    );

    const completedResult = await pool.query(
        "SELECT COUNT(*) FROM tasks WHERE done = TRUE"
    );

    const total = Number(totalResult.rows[0].count);

    const completed = Number(completedResult.rows[0].count);

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

app.get("/tasks/:id", async (req, res) => {

    const taskId = parseInt(req.params.id);

    const result = await pool.query(
        "SELECT * FROM tasks WHERE id = $1",
        [taskId]
    );

    const task = result.rows[0];

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

app.post("/tasks", async (req, res) => {

    if (!req.body.title || req.body.title.trim() === "") {
    return res.status(400).json({
        error: "Title is required"
    });
}

    const result = await pool.query(
    `INSERT INTO tasks (title, done)
     VALUES ($1, $2)
     RETURNING *`,
    [req.body.title, false]
);

res.status(201).json(result.rows[0]);

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

app.put("/tasks/:id", async (req, res) => {

    const taskId = parseInt(req.params.id);

    if (!req.body.title || req.body.title.trim() === "") {
        return res.status(400).json({
            error: "Title is required"
        });
    }

    const result = await pool.query(
        `UPDATE tasks
         SET title = $1, done = $2
         WHERE id = $3
         RETURNING *`,
        [
            req.body.title,
            req.body.done,
            taskId
        ]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: `Task ${taskId} not found`
        });
    }

    res.json(result.rows[0]);

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

app.delete("/tasks/:id", async (req, res) => {

    const taskId = parseInt(req.params.id);

    const result = await pool.query(
        `DELETE FROM tasks
         WHERE id = $1
         RETURNING *`,
        [taskId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            error: `Task ${taskId} not found`
        });
    }

    res.status(204).send();

});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});