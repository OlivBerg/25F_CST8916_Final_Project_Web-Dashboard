# Overview

A lightweight web dashboard that visualizes real-time telemetry, safety indicators, and historical metrics.

## Dashboard features

- Semi-Real-time data via HTTP requests made every 30 seconds
- Interactive charts and visualizations (Chart.js / D3)
- Safety status indicators

## Technologies used

- Frontend: HTML, CSS, Chart.js
- Backend: Node.js, Express
- Storage: CosmoDB
- Deployment: Azure App Service

## Prerequisites

- Node.js

## Installation

1. Clone the repo:
   ```
   git clone <this repo>
   ```
2. Install dependencies (which are linked in the package.json):
   ```
   npm install
   ```
3. Build and start :

   ```
   npm start
   ```

## Configuration

Create a .env file and add device connection strings

```
# .env file
COSMOS_ENDPOINT=
COSMOS_KEY=
COSMOS_DATABASE=
COSMOS_CONTAINER=
PORT=3000
```

## API Endpoints

#### `GET /api/latest`

**Description:** Retrieves the most recent readings for all monitored locations.

**Response:**

- `success` (boolean): Indicates if the request was successful.
- `timestamp` (string): The ISO 8601 timestamp when the data was fetched.
- `data` (array): An array of objects, where each object represents the latest reading for a location.
  - Each object includes data from Cosmos DB, plus a `locationName` field.

#### `GET /api/history/:deviceId`

**Description:** Retrieves historical data for a specific device/location.

**Parameters:**

- `:deviceId` (string, **required**): The ID of the device for which to fetch history (e.g., `fifthDevice`, `dowDevice`).
- `limit` (integer, **optional**, query parameter): The maximum number of historical records to retrieve. Defaults to 12 (representing the last hour if readings are taken every 5 minutes).

**Response:**

- `success` (boolean): Indicates if the request was successful.
- `deviceId` (string): The requested device ID.
- `locationName` (string): The friendly name of the location.
- `data` (array): An array of historical readings, sorted from oldest to newest, suitable for charting.

#### `GET /api/status`

**Description:** Provides an overview of the system's operational status and the status of individual locations.

**Response:**

- `success` (boolean): Indicates if the request was successful.
- `overallStatus` (string): The aggregated status of all locations ("Safe", "Unsafe", or "Caution").
- `locations` (array): An array of objects, each detailing the status of a specific location.
  - Each object includes `DeviceId`, `SafetyStatus`, `WindowEndTime`, and `locationName`.

#### `GET /api/all`

**Description:** (For debugging purposes) Retrieves all records from the data store, ordered by `WindowEndTime` in descending order.

**Response:**

- `success` (boolean): Indicates if the request was successful.
- `count` (integer): The total number of records fetched.
- `data` (array): An array containing all records from the data store.

### Other Endpoints

#### `GET /`

**Description:** Serves the main dashboard HTML file. This is not part of the `/api` prefix.

---

#### `GET /health`

**Description:** A health check endpoint to verify the server's status and configuration.

**Response:**

- `status` (string): "healthy" if the server is running.
- `timestamp` (string): Current ISO 8601 timestamp.
- `cosmosdb` (object): Details about Cosmos DB configuration (endpoint status, database, container).
- `devices` (array): A list of configured device IDs.

## Deployment to Azure App Service

1. Create a `Web App` throught `App Services`
2. In the `Deployment` tab, enable `Continuous deployment` and provide the github repo info
3. Review and Create
4. Create the 5 enviroment variable : `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE`, `COSMOS_CONTAINER` and `PORT`
5. Wait until the app updates or manually trigger an update in your repo so that Github Actions incorporates those value

## Dashboard Features

- Monitoring amount indicator
- Update interval indicator
- Canal length
- Global and regional safety indicators
- Regional telemetrics
- Historical trends
- Safety Status Guide

## Troubleshooting

- Had to modify backend variable names to reflect the data implemented in Azure CosmoDB and use the `deviceID` as a key identifier.
