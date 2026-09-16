const express = require("express");

const app = express();

app.use(express.json());

const startTime = new Date();

app.get("/", (req, res) => {
    res.json({
        service: "DevOps Portfolio Platform",
        status: "running",
        version: process.env.APP_VERSION || "development",
        environment: process.env.NODE_ENV || "development"
    });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        service: "devops-portfolio-platform",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get("/api/info", (req, res) => {
    res.json({
        application: "DevOps Portfolio Platform",
        version: process.env.APP_VERSION || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        node: process.version,
        startedAt: startTime.toISOString()
    });
});

module.exports = app;