const express = require("express");

const app = express();

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

app.get("/tasks", (req, res) => {
    res.json(tasks);
});

app.get("/tasks/:id", (req, res) => {

    const taskId = parseInt(req.params.id);

    const task = tasks.find(t => t.id === taskId);

    if (!task) {
        return res.status(404).json({
            error: `Task ${taskId} not found`
        });
    }

    res.json(task);

});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});