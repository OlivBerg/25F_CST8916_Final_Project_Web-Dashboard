// Configuration
const API_BASE_URL = window.location.origin;
const REFRESH_INTERVAL = 30000; // 30 seconds

const DEVICE_IDS = ["fifthDevice", "dowDevice", "nacDevice"];

const DEVICE_TO_DOM_KEY = {
  fifthDevice: "fifth",
  dowDevice: "dows",
  nacDevice: "nac",
};

const DEVICE_NAMES = {
  fifthDevice: "Fifth Avenue",
  dowDevice: "Dow's Lake",
  nacDevice: "NAC",
};

const CHART_COLORS = {
  fifthDevice: "rgb(255, 99, 132)",
  dowDevice: "rgb(75, 192, 192)",
  nacDevice: "rgb(54, 162, 235)",
};

let iceChart = null;
let tempChart = null;

async function initDashboard() {
  console.log("🚀 Initializing Rideau Canal Dashboard...");

  // Initial data fetch
  await updateDashboard();

  // Set up auto-refresh
  setInterval(updateDashboard, REFRESH_INTERVAL);

  console.log("✅ Dashboard initialized successfully");
}

/**
 * Update all dashboard data
 */
async function updateDashboard() {
  try {
    const latestResponse = await fetch(`${API_BASE_URL}/api/latest`);
    const latestData = await latestResponse.json();

    if (latestData.success) {
      updateLocationCards(latestData.data);
      updateLastUpdateTime();
    }

    const statusResponse = await fetch(`${API_BASE_URL}/api/status`);
    const statusData = await statusResponse.json();

    if (statusData.success) {
      updateOverallStatus(statusData.overallStatus);
    }

    await updateCharts();
  } catch (error) {
    console.error("Error updating dashboard:", error);
    showError("Failed to fetch latest data. Retrying...");
  }
}

function updateLocationCards(locations) {
  locations.forEach((location) => {
    const domKey = DEVICE_TO_DOM_KEY[location.DeviceId];

    if (!domKey) {
      console.warn(`Unknown DeviceId: ${location.DeviceId}`);
      return;
    }

    const iceEl = document.getElementById(`ice-${domKey}`);
    const tempEl = document.getElementById(`temp-${domKey}`);
    const snowEl = document.getElementById(`snow-${domKey}`);

    if (iceEl)
      iceEl.textContent = location.AvgIceThickness?.toFixed(1) ?? "N/A";
    if (tempEl)
      tempEl.textContent = location.AvgSurfaceTemp?.toFixed(1) ?? "N/A";
    if (snowEl)
      snowEl.textContent = location.MaxSnowAccumulation?.toFixed(1) ?? "N/A";

    // Update safety status
    const statusBadge = document.getElementById(`status-${domKey}`);
    if (statusBadge && location.SafetyStatus) {
      statusBadge.textContent = location.SafetyStatus;
      statusBadge.className = `safety-badge ${location.SafetyStatus.toLowerCase()}`;
    }
  });
}

/**
 * Update overall status badge
 */
function updateOverallStatus(status) {
  const statusBadge = document.getElementById("overallStatus");
  if (statusBadge) {
    statusBadge.className = `status-badge ${status.toLowerCase()}`;
    statusBadge.innerHTML = `<span class="status-text">Canal Status: ${status}</span>`;
  }
}

function updateLastUpdateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const lastUpdateEl = document.getElementById("lastUpdate");
  if (lastUpdateEl) {
    lastUpdateEl.textContent = timeString;
  }
}

async function updateCharts() {
  try {
    const historicalData = await Promise.all(
      DEVICE_IDS.map(async (deviceId) => {
        const response = await fetch(
          `${API_BASE_URL}/api/history/${encodeURIComponent(deviceId)}?limit=12`
        );
        const data = await response.json();
        return {
          deviceId,
          locationName: DEVICE_NAMES[deviceId],
          data: data.data || [],
        };
      })
    );

    const validData = historicalData.filter((d) => d.data.length > 0);

    if (validData.length === 0) {
      console.warn("No historical data available for charts");
      return;
    }

    const iceDatasets = validData.map(({ deviceId, locationName, data }) => ({
      label: locationName,
      data: data.map((d) => d.AvgIceThickness),
      borderColor: CHART_COLORS[deviceId],
      backgroundColor: CHART_COLORS[deviceId] + "33",
      tension: 0.4,
      fill: false,
    }));

    const tempDatasets = validData.map(({ deviceId, locationName, data }) => ({
      label: locationName,
      data: data.map((d) => d.AvgSurfaceTemp),
      borderColor: CHART_COLORS[deviceId],
      backgroundColor: CHART_COLORS[deviceId] + "33",
      tension: 0.4,
      fill: false,
    }));

    const labels = validData[0].data.map((d) =>
      new Date(d.WindowEndTime).toLocaleTimeString("en-CA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    const iceCtx = document
      .getElementById("iceThicknessChart")
      ?.getContext("2d");
    if (iceCtx) {
      if (iceChart) {
        iceChart.data.labels = labels;
        iceChart.data.datasets = iceDatasets;
        iceChart.update();
      } else {
        iceChart = new Chart(iceCtx, {
          type: "line",
          data: {
            labels: labels,
            datasets: iceDatasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: "top",
              },
            },
            scales: {
              y: {
                beginAtZero: false,
                title: {
                  display: true,
                  text: "Ice Thickness (cm)",
                },
              },
            },
          },
        });
      }
    }

    const tempCtx = document
      .getElementById("temperatureChart")
      ?.getContext("2d");
    if (tempCtx) {
      if (tempChart) {
        tempChart.data.labels = labels;
        tempChart.data.datasets = tempDatasets;
        tempChart.update();
      } else {
        tempChart = new Chart(tempCtx, {
          type: "line",
          data: {
            labels: labels,
            datasets: tempDatasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: "top",
              },
            },
            scales: {
              y: {
                title: {
                  display: true,
                  text: "Surface Temperature (°C)",
                },
              },
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("Error updating charts:", error);
  }
}

/**
 * Show error message
 */
function showError(message) {
  console.error(message);
  // You can add a toast notification here if needed
}

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", initDashboard);
