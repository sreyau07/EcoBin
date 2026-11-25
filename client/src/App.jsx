import Login from "./pages/Login";
import WorkerManagement from "./components/WorkerManagement";
import WorkerDashboard from "./components/WorkerDashboard";
import { useEffect, useState } from "react";




import BinMap from "./components/BinMap";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiLogOut ,
  FiBox,
  FiChevronRight,
  FiGrid,
  FiMenu,
  FiPlusCircle,
  FiRefreshCw,
  FiSettings,
  FiTruck,
  FiX
} from "react-icons/fi";
import API from "./services/api";
import { FiUsers } from "react-icons/fi";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const navigation = [
  { id: "overview", label: "Overview", icon: FiGrid },
  { id: "monitoring", label: "Bin Monitoring", icon: FiBox },
  { id: "add-bin", label: "Add New Bin", icon: FiPlusCircle },
  { id: "predictions", label: "Predictions", icon: FiActivity },
  { id: "history", label: "History & Analytics", icon: FiBarChart2 },
  { id: "alerts", label: "Alerts", icon: FiBell },
   { id: "route", label: "Smart Collection Route", icon: FiTruck },
  { id: "settings", label: "Settings", icon: FiSettings },
  {id: "workers",label: "Worker Management",icon: FiUsers}
];

function App() {
  const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);
  const [collections, setCollections] = useState([]);
  const [histories, setHistories] = useState({});
  const [predictions, setPredictions] = useState({});
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [binId, setBinId] = useState("");
  const [location, setLocation] = useState("");
  const [fillLevel, setFillLevel] = useState(0);
  const [gasLevel, setGasLevel] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
const [routeLoading, setRouteLoading] = useState(false);
const [routeError, setRouteError] = useState("");


const [isLoggedIn, setIsLoggedIn] = useState(
  !!localStorage.getItem("token")
);

const user = JSON.parse(localStorage.getItem("user") || "null");

if (!isLoggedIn) {
  return <Login />;
}
// Show separate dashboard for collection workers
if (user?.role === "worker") {
  return (
    <div>
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "15px 25px",
        background: "#14532d"
      }}>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.reload();
          }}
          style={{
            background: "#ffffff",
            color: "#14532d",
            border: "none",
            padding: "9px 18px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Logout
        </button>
      </div>

      <WorkerDashboard />
    </div>
  );
}
  const fetchPredictions = async (binList) => {
    const results = {};

    await Promise.all(
      binList.map(async (bin) => {
        try {
          const response = await API.get(`/bins/prediction/${bin.binId}`);
          results[bin.binId] = response.data;
        } catch {
          results[bin.binId] = {
            success: false,
            message: "Not enough data for prediction"
          };
        }
      })
    );

    setPredictions(results);
  };
const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
};
  const fetchNotifications = async () => {
  try {
    const response = await API.get("/bins/notifications");

    setNotifications(response.data.notifications || []);
    setUnreadCount(response.data.unreadCount || 0);
  } catch (error) {
    console.error("Notification fetch error:", error);
  }
};

  const fetchHistories = async (binList) => {
    const results = {};

    await Promise.all(
      binList.map(async (bin) => {
        try {
          const response = await API.get(`/bins/history/${bin.binId}`);
          results[bin.binId] = response.data.readings || [];
        } catch (historyError) {
          console.error(`History error for ${bin.binId}:`, historyError);
          results[bin.binId] = [];
        }
      })
    );

    setHistories(results);
  };

  const fetchOptimizedRoute = async () => {
  try {
    setRouteLoading(true);
    setRouteError("");

    const response = await API.get(
      "/bins/optimize-route?startLat=10.9950&startLng=76.9660"
    );

    setOptimizedRoute(response.data);

  } catch (error) {
    console.error("Route optimization error:", error);

    setRouteError(
      error.response?.data?.message ||
      "Unable to optimize collection route"
    );
  } finally {
    setRouteLoading(false);
  }
};

  const fetchBins = async () => {
    try {
      setError("");
      const response = await API.get("/bins");
      const binData = response.data;

      const binList = Array.isArray(binData)
        ? binData
        : Array.isArray(binData.bins)
        ? binData.bins
        : [];

      setBins(binList);
      await Promise.all([
        fetchPredictions(binList),
        fetchHistories(binList)
      ]);
    } catch (fetchError) {
      setError("Unable to load bin data. Please check that the backend is running.");
      console.error(fetchError);
    } finally {
      setLoading(false);
    }
  };
// Mark bin as collected
const handleCollectBin = async (binId) => {
  try {
    const confirmCollection = window.confirm(
      `Are you sure you want to mark ${binId} as collected?`
    );

    if (!confirmCollection) return;

    const response = await API.patch(`/bins/collect/${binId}`);

    alert(response.data.message);

    
    await fetchBins();
    await fetchCollections();
  } catch (error) {
    console.error("Collection error:", error);

    alert(
      error.response?.data?.message ||
      "Unable to mark bin as collected"
    );
  }
};

  const handleAddBin = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      await API.post("/bins", {
        binId: binId.trim(),
        location: location.trim(),
        fillLevel: Number(fillLevel),
        gasLevel: Number(gasLevel)
      });

      alert("Sensor reading saved successfully!");
      setBinId("");
      setLocation("");
      setFillLevel(0);
      setGasLevel(0);
      await fetchBins();
      navigateTo("monitoring");
    } catch (saveError) {
      console.error(saveError);
      alert(saveError.response?.data?.message || "Unable to save sensor data");
    } finally {
      setSaving(false);
    }
  };

  const navigateTo = (sectionId) => {
  setActiveSection(sectionId);
  setSidebarOpen(false);

  setTimeout(() => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
};
 useEffect(() => {
  fetchBins();
  fetchCollections();
  fetchNotifications();

  const interval = setInterval(() => {
    fetchBins();
    fetchCollections();
    fetchNotifications();
  }, 15000);

  return () => clearInterval(interval);
}, []);

  const totalBins = bins.length;
  const normalBins = bins.filter((bin) => bin.status === "Normal").length;
  const warningBins = bins.filter((bin) => bin.status === "Warning").length;
  const criticalBins = bins.filter((bin) => bin.status === "Critical").length;
  const alertBins = bins.filter(
    (bin) => bin.status === "Warning" || bin.status === "Critical"
  );

  const latestUpdate = bins.length
    ? new Date(
        Math.max(...bins.map((bin) => new Date(bin.lastUpdated || bin.updatedAt || Date.now()).getTime()))
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--";
 // Fetch collection history
const fetchCollections = async () => {
  try {
    const response = await API.get("/bins/collections");

    setCollections(response.data.collections || []);
  } catch (error) {
    console.error("Collection history error:", error);
  }
};


  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      
<aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
  <div className="brand">
    <div className="brand-mark"><FiTruck /></div>
    <div>
      <h1>EcoBin</h1>
      <span>SMART WASTE SYSTEM</span>
    </div>
    <button
      className="sidebar-close"
      aria-label="Close menu"
      onClick={() => setSidebarOpen(false)}
    >
      <FiX />
    </button>
  </div>

  <div className="nav-caption">WORKSPACE</div>

  <nav className="side-nav" aria-label="Main navigation">
    {navigation.map((item) => {
      const Icon = item.icon;

      return (
        <button
          key={item.id}
          className={`nav-item ${activeSection === item.id ? "active" : ""}`}
          onClick={() => navigateTo(item.id)}
        >
          <Icon className="nav-icon" />
          <span>{item.label}</span>

          {item.id === "alerts" && unreadCount > 0 && (
            <span className="sidebar-notification-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}

          {activeSection === item.id && (
            <FiChevronRight className="nav-arrow" />
          )}
        </button>
      );
    })}
  </nav>

  <div className="sidebar-bottom">
    <div className="sidebar-status">
      <span className="online-dot" />
      <div>
        <strong>System status</strong>
        <small>Monitoring active</small>
      </div>
    </div>

    <div className="sidebar-footer">
      EcoBin · Project Dashboard
    </div>

    <button className="nav-item logout-btn" onClick={handleLogout}>
      <FiLogOut className="nav-icon" />
      <span>Logout</span>
    </button>
  </div>
</aside>


      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu />
            </button>
            <div>
              <div className="breadcrumb">Workspace <span>/</span> {navigation.find((item) => item.id === activeSection)?.label || "Overview"}</div>
              <h2>Waste Management Dashboard</h2>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="live-indicator"><span /> Live monitoring</div>
            <button className="refresh-button" onClick={fetchBins}>
              <FiRefreshCw /> <span>Refresh</span>
            </button>
            <div className="profile-chip">
              <div className="profile-avatar">E</div>
              <div><strong>EcoBin Admin</strong><small>Administrator</small></div>
            </div>
          </div>
        </header>

        {error && <div className="error-banner"><FiAlertTriangle /> {error}</div>}

        <section id="overview" className="page-section overview-section">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1>Good day, Admin <span>👋</span></h1>
              <p className="section-subtitle">Here is what's happening with your smart bins today.</p>
            </div>
            <div className="updated-label"><span className="online-dot" /> Last synced: {latestUpdate}</div>
          </div>

          <div className="stats-grid">
            <article className="metric-card total-metric">
              <div className="metric-top"><span>Total bins</span><div className="metric-icon blue"><FiBox /></div></div>
              <strong>{totalBins}</strong>
              <small>Registered smart bins</small>
            </article>
            <article className="metric-card normal-metric">
              <div className="metric-top"><span>Normal</span><div className="metric-icon green"><FiActivity /></div></div>
              <strong>{normalBins}</strong>
              <small>Operating normally</small>
            </article>
            <article className="metric-card warning-metric">
              <div className="metric-top"><span>Needs attention</span><div className="metric-icon amber"><FiAlertTriangle /></div></div>
              <strong>{warningBins}</strong>
              <small>Fill level between 60–79%</small>
            </article>
            <article className="metric-card critical-metric">
              <div className="metric-top"><span>Critical bins</span><div className="metric-icon red"><FiBell /></div></div>
              <strong>{criticalBins}</strong>
              <small>Fill level at least 80%</small>
            </article>
          </div>

          <div className="overview-grid">
            <article className="panel quick-panel">
              <div className="panel-heading">
                <div><h3>Quick actions</h3><p>Manage your smart waste network</p></div>
              </div>
              <div className="quick-actions">
                <button onClick={() => navigateTo("add-bin")}><FiPlusCircle /><span><strong>Add sensor reading</strong><small>Register or update a bin</small></span><FiChevronRight /></button>
                <button onClick={() => navigateTo("monitoring")}><FiBox /><span><strong>View all bins</strong><small>Check fill levels and status</small></span><FiChevronRight /></button>
                <button onClick={() => navigateTo("predictions")}><FiActivity /><span><strong>View predictions</strong><small>See the six-hour forecast</small></span><FiChevronRight /></button>
              </div>
            </article>

            <article className="panel network-panel">
              <div className="panel-heading"><div><h3>Network health</h3><p>Current bin status distribution</p></div></div>
              <div className="network-total"><strong>{totalBins}</strong><span>Bins monitored</span></div>
              <div className="stacked-bar">
                {totalBins > 0 && <>
                  <span className="bar-normal" style={{ width: `${(normalBins / totalBins) * 100}%` }} />
                  <span className="bar-warning" style={{ width: `${(warningBins / totalBins) * 100}%` }} />
                  <span className="bar-critical" style={{ width: `${(criticalBins / totalBins) * 100}%` }} />
                </>}
              </div>
              <div className="legend-list">
                <span><i className="legend-dot dot-normal" /> Normal <b>{normalBins}</b></span>
                <span><i className="legend-dot dot-warning" /> Warning <b>{warningBins}</b></span>
                <span><i className="legend-dot dot-critical" /> Critical <b>{criticalBins}</b></span>
              </div>
            </article>
                   </div>

          {/* Recent Sensor Activity */}
          <div className="panel sensor-activity-panel">
            <div className="panel-heading">
              <div>
                <h3>Recent Sensor Activity</h3>
                <p>Latest updates received from smart bins</p>
              </div>
              <button onClick={() => navigateTo("monitoring")}>
                View all bins →
              </button>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Bin ID</th>
                    <th>Location</th>
                    <th>Fill Level</th>
                    <th>Gas Level</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>

                <tbody>
                  {[...bins]
                    .sort(
                      (a, b) =>
                        new Date(b.lastUpdated || b.updatedAt || 0) -
                        new Date(a.lastUpdated || a.updatedAt || 0)
                    )
                    .slice(0, 5)
                    .map((bin) => (
                      <tr key={bin._id || bin.binId}>
                        <td>{bin.binId}</td>
                        <td>{bin.location}</td>
                        <td>{bin.fillLevel}%</td>
                        <td>{bin.gasLevel}</td>
                        <td>
                          <span className={`status-badge ${String(bin.status || "Normal").toLowerCase()}`}>
                            {bin.status || "Normal"}
                          </span>
                        </td>
                        <td>
                          {bin.lastUpdated
                            ? new Date(bin.lastUpdated).toLocaleString()
                            : "Not available"}
                        </td>
                      </tr>
                    ))}

                  {bins.length === 0 && (
                    <tr>
                      <td colSpan="6">No sensor activity available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section id="monitoring" className="page-section">
          <div className="section-heading">
            <div><p className="eyebrow">LIVE DATA</p><h2>Bin monitoring</h2><p className="section-subtitle">Monitor fill levels and sensor information for every registered bin.</p></div>
            <button className="primary-button" onClick={() => navigateTo("add-bin")}><FiPlusCircle /> Add reading</button>
          </div>

          {loading && <div className="empty-state">Loading bin information...</div>}
          {!loading && bins.length === 0 && <div className="empty-state">No bins found. Add your first bin using the sensor form.</div>}
<div className="bin-grid">
  {bins.map((bin) => (
    <article className="bin-card" key={bin._id || bin.binId}>

      <div className="bin-card-top">
        <div className="bin-symbol"><FiBox /></div>
        <span className={`status-pill ${String(bin.status || "Normal").toLowerCase()}`}>
          {bin.status || "Normal"}
        </span>
      </div>

      <h3>{bin.binId}</h3>
      <p className="bin-location">{bin.location}</p>

      <div className="fill-value-row">
        <span>Waste fill level</span>
        <strong>{bin.fillLevel}%</strong>
      </div>

      <div className="progress">
        <div
          className={`progress-fill ${String(bin.status || "Normal").toLowerCase()}`}
          style={{ width: `${bin.fillLevel}%` }}
        />
      </div>

      <div className="bin-meta">
        <span>Gas reading</span>
        <strong>{bin.gasLevel ?? 0}</strong>
      </div>

      <div className="bin-meta">
        <span>Last updated</span>
        <strong>
          {bin.lastUpdated ? new Date(bin.lastUpdated).toLocaleString() : "—"}
        </strong>
      </div>

      {/* Collection Button */}
      <button
        className="collect-btn"
        onClick={() => handleCollectBin(bin.binId)}
        disabled={bin.fillLevel === 0}
      >
        {bin.fillLevel === 0 ? "Already Collected" : "Mark as Collected"}
      </button>

    </article>
  ))}
</div>
        </section>

        <section id="add-bin" className="page-section">
          <div className="section-heading">
            <div><p className="eyebrow">SENSOR INPUT</p><h2>Add or update a bin</h2><p className="section-subtitle">Send simulated IoT readings while hardware is being prepared.</p></div>
          </div>
          <div className="panel form-panel">
            <div className="form-intro"><div className="large-form-icon"><FiActivity /></div><div><h3>IoT sensor simulation</h3><p>Enter the bin details and the latest sensor values.</p></div></div>
            <form onSubmit={handleAddBin} className="sensor-form">
              <div className="form-grid">
                <label>Bin ID<input type="text" placeholder="Example: BIN-02" value={binId} onChange={(event) => setBinId(event.target.value)} required /></label>
                <label>Bin location<input type="text" placeholder="Example: College Main Gate" value={location} onChange={(event) => setLocation(event.target.value)} required /></label>
                <label className="range-field">Waste fill level <strong>{fillLevel}%</strong><input type="range" min="0" max="100" value={fillLevel} onChange={(event) => setFillLevel(event.target.value)} /><span className="range-hints"><small>Empty · 0%</small><small>Full · 100%</small></span></label>
                <label>Gas sensor reading<input type="number" min="0" value={gasLevel} onChange={(event) => setGasLevel(event.target.value)} /></label>
              </div>
              <div className="form-footer"><p>Submitting saves the current bin state and a historical sensor reading.</p><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Send sensor data"} <FiChevronRight /></button></div>
            </form>
          </div>
        </section>

        <section id="predictions" className="page-section">
          <div className="section-heading"><div><p className="eyebrow">FORECAST</p><h2>Six-hour predictions</h2><p className="section-subtitle">Rate-based estimates calculated from saved sensor readings.</p></div></div>
          <div className="bin-grid">
            {bins.map((bin) => {
              const prediction = predictions[bin.binId];
              return (
                <article className="prediction-card" key={`prediction-${bin.binId}`}>
                  <div className="prediction-card-heading"><div className="bin-symbol"><FiActivity /></div><span>{bin.binId}</span></div>
                  {!prediction || !prediction.success ? (
                    <div className="prediction-empty"><FiActivity /><p>Not enough historical data</p><small>Submit readings at different times to generate a forecast.</small></div>
                  ) : (
                    <>
                      <div className="prediction-number">{prediction.predictedFillLevel}<small>%</small></div>
                      <p className="prediction-caption">Estimated fill level after 6 hours</p>
                      <div className="prediction-details"><span>Current level <b>{prediction.currentFillLevel}%</b></span><span>Rate per hour <b>{prediction.fillRatePerHour}%</b></span></div>
                      <div className={`prediction-message ${prediction.willReachCritical ? "danger" : "safe"}`}>
                        {prediction.willReachCritical ? <FiAlertTriangle /> : <FiActivity />}
                        {prediction.willReachCritical ? "May reach critical level" : "Expected below critical level"}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
          {bins.length === 0 && <div className="empty-state">Add a bin to view predictions.</div>}
        </section>

        <section id="history" className="page-section">
          <div className="section-heading"><div><p className="eyebrow">ANALYTICS</p><h2>History & analytics</h2><p className="section-subtitle">Review how each bin's fill level changes over time.</p></div></div>
          <div className="history-grid">
            {bins.map((bin) => {
              const readings = histories[bin.binId] || [];
              const chartData = {
                labels: readings.map((reading) => new Date(reading.recordedAt).toLocaleString()),
                datasets: [{
                  label: "Waste fill level (%)",
                  data: readings.map((reading) => reading.fillLevel),
                  borderColor: "#16845b",
                  backgroundColor: "rgba(22, 132, 91, 0.12)",
                  pointBackgroundColor: "#16845b",
                  pointRadius: 4,
                  fill: true,
                  tension: 0.35
                }]
              };
              return (
                <article className="panel history-card" key={`history-${bin.binId}`}>
                  <div className="panel-heading"><div><h3>{bin.binId}</h3><p>{bin.location}</p></div><span className="chart-tag">{readings.length} readings</span></div>
                  {readings.length < 2 ? <div className="chart-empty">Submit at least two readings to display the trend graph.</div> : (
                    <div className="chart-container">
                    <Line data={chartData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
                      scales: {
                        y: { min: 0, max: 100, title: { display: true, text: "Fill level (%)" }, grid: { color: "#edf1ef" } },
                        x: { title: { display: true, text: "Recorded time" }, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 5 } }
                      }
                    }} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {bins.length === 0 && <div className="empty-state">No historical data available yet.</div>}
        </section>

       
<section id="alerts" className="page-section">
  <div className="section-heading">
    <div>
      <p className="eyebrow">ATTENTION REQUIRED</p>
      <h2>Alerts & Notifications</h2>
      <p className="section-subtitle">
        Monitor and manage waste bin alerts.
      </p>
    </div>

    <span className="alert-count">{unreadCount} unread</span>
  </div>

  <div className="notification-actions">
    <button
      className="primary-button"
      onClick={fetchNotifications}
    >
      <FiRefreshCw /> Refresh
    </button>

    <button
      className="primary-button"
      onClick={async () => {
        try {
          await API.patch("/bins/notifications/read-all");
          await fetchNotifications();
        } catch (error) {
          console.error(error);
        }
      }}
    >
      Mark All Read
    </button>
  </div>

  <div className="notification-list">
    {notifications.length === 0 ? (
      <div className="success-state">
        <FiActivity />
        <div>
          <strong>All clear</strong>
          <p>No notifications available.</p>
        </div>
      </div>
    ) : (
      notifications.map((item) => (
        <article
         className={`notification-card ${String(item.type || "warning").toLowerCase()}`}
          key={item._id}
        >
          <div className="notification-icon">
          
            {item.type === "Critical" ? "⚠️" : "🔔"}
          </div>

          <div className="notification-details">
            <h4>{item.binId} — {item.type || "Warning"}</h4>
            <p>{item.message}</p>
            <small>
              {item.location} · {item.fillLevel}% full
            </small>
            <small>
              {new Date(item.createdAt).toLocaleString()}
            </small>
          </div>

          {!item.isRead && (
            <button
              className="read-btn"
              onClick={async () => {
                try {
                  await API.patch(
                    `/bins/notifications/${item._id}/read`
                  );
                  await fetchNotifications();
                } catch (error) {
                  console.error(error);
                }
              }}
            >
              Mark Read
            </button>
          )}

          {item.isRead && <span>Read ✓</span>}
        </article>
      ))
    )}
  </div>
</section>


        <section id="settings" className="page-section">
          <div className="section-heading"><div><p className="eyebrow">PREFERENCES</p><h2>System settings</h2><p className="section-subtitle">Current monitoring rules used by this dashboard.</p></div></div>
          <div className="panel settings-panel">
            <div className="setting-row"><div><strong>Normal status</strong><p>Bin fill level below 60%.</p></div><span className="status-pill normal">0–59%</span></div>
            <div className="setting-row"><div><strong>Warning status</strong><p>Bin fill level from 60% to 79%.</p></div><span className="status-pill warning">60–79%</span></div>
            <div className="setting-row"><div><strong>Critical status</strong><p>Bin fill level at least 80%.</p></div><span className="status-pill critical">80–100%</span></div>
            <div className="setting-note"><FiSettings /> These thresholds reflect the status rules currently implemented in your backend.</div>
          </div>
         
        </section>
        {activeSection === "workers" && (
  <section id="workers" className="page-section">
    <WorkerManagement />
  </section>
)}

        <footer className="main-footer"><span>© {new Date().getFullYear()} EcoBin Smart Waste Management</span><span>Monitor · Predict · Collect · Optimize</span></footer>
        
      



<section id="route" className="route-section">
  <div className="route-header">
    <div>
      <span className="route-label">ECObin • COLLECTION MANAGEMENT</span>
      <h2>Smart Collection Planner</h2>
      <p>Plan an efficient collection journey for your waste bins.</p>
    </div>

    <button
      className="optimize-btn"
      onClick={fetchOptimizedRoute}
      disabled={routeLoading}
    >
      {routeLoading ? "Optimizing..." : "↻ Optimize Route"}
    </button>
  </div>

  {routeError && <p className="error">{routeError}</p>}

  {optimizedRoute && (
    <>
      <div className="route-summary">
        <div className="route-summary-card">
          <span>Bins to Collect</span>
          <h2>{optimizedRoute.totalBins}</h2>
          <small>Collection stops</small>
        </div>

        <div className="route-summary-card">
          <span>Estimated Distance</span>
          <h2>{optimizedRoute.totalDistanceKm} km</h2>
          <small>Straight-line distance</small>
        </div>

        <div className="route-summary-card">
          <span>Algorithm</span>
          <h2>Nearest</h2>
          <small>Neighbor algorithm</small>
        </div>
      </div>

      <div className="collection-list">
        <div className="collection-title">
          <div>
            <h3>Collection Journey</h3>
            <p>Follow these stops in the suggested order.</p>
          </div>
          <span className="route-status">Route Ready</span>
        </div>

        {optimizedRoute.route.length === 0 ? (
          <p>No bins currently require collection.</p>
        ) : (
          optimizedRoute.route.map((bin, index) => (
            <div className="collection-stop" key={bin.binId}>
              <div className="stop-number">{index + 1}</div>

              <div className="stop-details">
                <div className="stop-heading">
                  <h4>{bin.binId}</h4>
                  <span className={`route-badge ${bin.status.toLowerCase()}`}>
                    {bin.status}
                  </span>
                </div>

                <p>{bin.location}</p>

                <div className="stop-progress">
                  <div>
                    <span>Waste fill level</span>
                    <strong>{bin.fillLevel}%</strong>
                  </div>

                  <div className="stop-progress-track">
                    <div
                      className={`stop-progress-fill ${bin.status.toLowerCase()}`}
                      style={{ width: `${bin.fillLevel}%` }}
                    />
                  </div>
                </div>

                <small>
                  Distance from previous stop:{" "}
                  {bin.distanceFromPreviousKm} km
                </small>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )}
</section>

{/* Bin Location Map */}
<section className="map-section">
  <div className="section-heading">
    <div>
      <h2>Live Bin Locations</h2>
      <p>Monitor waste bins across their locations.</p>
    </div>
    <span className="map-live-badge">● Live Map</span>
  </div>

 <BinMap
  bins={bins}
  route={optimizedRoute?.route || []}
/>
{optimizedRoute && (
  <div className="map-route-info">
    <div>
      <span>Collection Stops</span>
      <h3>{optimizedRoute.totalBins}</h3>
    </div>

    <div>
      <span>Estimated Distance</span>
      <h3>{optimizedRoute.totalDistanceKm} km</h3>
    </div>

    <div>
      <span>Algorithm</span>
      <h3>Nearest Neighbor</h3>
    </div>
  </div>
)}

  <div className="map-legend">
    <span><i className="legend-dot normal-dot"></i> Normal</span>
    <span><i className="legend-dot warning-dot"></i> Warning</span>
    <span><i className="legend-dot critical-dot"></i> Critical</span>
  </div>
</section>
{/* Collection History */}
<section className="history-section">
  <div className="section-heading">
    <div>
      <h2>Collection History</h2>
      <p>Track previously collected waste bins.</p>
    </div>
   <div className="history-actions">
  <span className="history-count">
    {collections.length} Collections
  </span>

  <button
    className="history-refresh-btn"
    onClick={fetchCollections}
  >
    ↻ Refresh
  </button>
</div>
  </div>

  <div className="history-table-wrapper">
    <table className="history-table">
      <thead>
        <tr>
          <th>Bin ID</th>
          <th>Location</th>
          <th>Previous Fill</th>
          <th>Collected By</th>
          <th>Collection Date</th>
        </tr>
      </thead>

      <tbody>
        {collections.length === 0 ? (
          <tr>
            <td colSpan="5" className="empty-history">
              No collection history available yet.
            </td>
          </tr>
        ) : (
          collections.map((item) => (
            <tr key={item._id}>
              <td><strong>{item.binId}</strong></td>
              <td>{item.location}</td>
              <td>
                <span className="previous-fill">
                  {item.previousFillLevel}%
                </span>
              </td>
              <td>{item.collectedBy}</td>
              <td>
                {new Date(item.collectedAt).toLocaleString()}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</section>
</main>

    </div>
  );
}

export default App;
