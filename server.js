/**
 * Rideau Canal Monitoring Dashboard - Backend Server
 * Serves the dashboard and provides API endpoints for real-time data
 */

const express = require("express");
const { CosmosClient } = require("@azure/cosmos");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Initialize Cosmos DB Client
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

const database = cosmosClient.database(process.env.COSMOS_DATABASE);
const container = database.container(process.env.COSMOS_CONTAINER);

// Device IDs from your IoT Hub (must match IoTHub.ConnectionDeviceId)
const DEVICE_IDS = ["fifthDevice", "dowDevice", "nacDevice"];

// Map device IDs to friendly names
const DEVICE_NAMES = {
  fifthDevice: "Fifth Avenue",
  dowDevice: "Dow's Lake",
  nacDevice: "NAC",
};

/**
 * API Endpoint: Get latest readings for all locations
 */
app.get("/api/latest", async (req, res) => {
  try {
    const results = [];

    for (const deviceId of DEVICE_IDS) {
      const querySpec = {
        query:
          "SELECT * FROM c WHERE c.DeviceId = @deviceId ORDER BY c.WindowEndTime DESC OFFSET 0 LIMIT 1",
        parameters: [{ name: "@deviceId", value: deviceId }],
      };

      const { resources } = await container.items.query(querySpec).fetchAll();

      if (resources.length > 0) {
        results.push({
          ...resources[0],
          locationName: DEVICE_NAMES[deviceId] || deviceId,
        });
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: results,
    });
  } catch (error) {
    console.error("Error fetching latest data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch latest data",
    });
  }
});

/**
 * API Endpoint: Get historical data for a specific device
 */
app.get("/api/history/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 12; // Last hour (12 * 5 min)

    const querySpec = {
      query: `SELECT * FROM c WHERE c.DeviceId = @deviceId ORDER BY c.WindowEndTime DESC OFFSET 0 LIMIT @limit`,
      parameters: [
        { name: "@deviceId", value: deviceId },
        { name: "@limit", value: limit },
      ],
    };

    const { resources } = await container.items.query(querySpec).fetchAll();

    res.json({
      success: true,
      deviceId: deviceId,
      locationName: DEVICE_NAMES[deviceId] || deviceId,
      data: resources.reverse(), // Oldest to newest for charting
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch historical data",
    });
  }
});

/**
 * API Endpoint: Get overall system status
 */
app.get("/api/status", async (req, res) => {
  try {
    const statuses = [];

    for (const deviceId of DEVICE_IDS) {
      const querySpec = {
        query:
          "SELECT c.DeviceId, c.SafetyStatus, c.WindowEndTime FROM c WHERE c.DeviceId = @deviceId ORDER BY c.WindowEndTime DESC OFFSET 0 LIMIT 1",
        parameters: [{ name: "@deviceId", value: deviceId }],
      };

      const { resources } = await container.items.query(querySpec).fetchAll();

      if (resources.length > 0) {
        statuses.push({
          ...resources[0],
          locationName: DEVICE_NAMES[deviceId] || deviceId,
        });
      }
    }

    // Determine overall status
    const overallStatus = statuses.every((s) => s.SafetyStatus === "Safe")
      ? "Safe"
      : statuses.some((s) => s.SafetyStatus === "Unsafe")
      ? "Unsafe"
      : "Caution";

    res.json({
      success: true,
      overallStatus: overallStatus,
      locations: statuses,
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch system status",
    });
  }
});

/**
 * API Endpoint: Get all data (for debugging)
 */
app.get("/api/all", async (req, res) => {
  try {
    const querySpec = {
      query: "SELECT * FROM c ORDER BY c.WindowEndTime DESC",
    };

    const { resources } = await container.items.query(querySpec).fetchAll();
    console.log(`Fetched ${resources.length} total records.`);

    res.json({
      success: true,
      count: resources.length,
      data: resources,
    });
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch all data",
    });
  }
});

/**
 * Serve the dashboard
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    cosmosdb: {
      endpoint: process.env.COSMOS_ENDPOINT ? "configured" : "missing",
      database: process.env.COSMOS_DATABASE,
      container: process.env.COSMOS_CONTAINER,
    },
    devices: DEVICE_IDS,
  });
});

// Start server
app.listen(port, () => {
  console.log(
    `🚀 Rideau Canal Dashboard server running on http://localhost:${port}`
  );
  console.log(`📊 API endpoints available at http://localhost:${port}/api`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down server...");
  process.exit(0);
});
