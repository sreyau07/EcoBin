
import React, { useEffect, useState } from "react";
import API from "../services/api";
import "./WorkerDashboard.css";

const WorkerDashboard = () => {
  const [bins, setBins] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

const fetchData = async () => {
  try {
    setError(""); // Clear previous error

    const [binsResponse, collectionsResponse] = await Promise.all([
      API.get("/bins"),
      API.get("/bins/collections")
    ]);

    console.log("BIN RESPONSE:", binsResponse.data);
    console.log("COLLECTION RESPONSE:", collectionsResponse.data);

    setBins(
      Array.isArray(binsResponse.data)
        ? binsResponse.data
        : binsResponse.data.bins || []
    );

    setCollections(collectionsResponse.data.collections || []);
    setLastUpdated(new Date());

  } catch (err) {
    setError(
      err.response?.data?.message ||
      "Unable to load worker dashboard."
    );
  } finally {
    setLoading(false);
  }
};
  
  useEffect(() => {
  fetchData();

  const refreshInterval = setInterval(() => {
    fetchData();
  }, 10000);

  return () => clearInterval(refreshInterval);
}, []);
const handleCollect = async (binId) => {
  const confirmCollect = window.confirm(
    `Are you sure you want to mark ${binId} as collected?`
  );

  if (!confirmCollect) return;

  setMessage("");
  setError("");

  try {
    const response = await API.patch(`/bins/collect/${binId}`);

    setMessage(response.data.message || "Bin collected successfully.");

    await fetchData();
  } catch (err) {
    setError(
      err.response?.data?.message ||
      "Unable to mark bin as collected."
    );
  }
};

  const binsToCollect = bins.filter(
    (bin) => bin.fillLevel >= 60
  );

  if (loading) {
    return <div className="worker-dashboard">Loading dashboard...</div>;
  }

  return (
    <div className="worker-dashboard">
      
      <div className="worker-dashboard-header">
  <div>
    <h2>Collection Worker Dashboard</h2>
    <p>Monitor bins and manage waste collection.</p>
  </div>

  <div className="worker-last-updated">
    <span>● Live Dashboard</span>
    <p>
      Last Updated:{" "}
      {lastUpdated
        ? lastUpdated.toLocaleTimeString()
        : "Loading..."}
    </p>
  </div>
</div>

      {message && <p className="worker-success">{message}</p>}
      {error && <p className="worker-error">{error}</p>}

      <div className="worker-stats">
        <div className="worker-stat-card">
          <h3>{bins.length}</h3>
          <p>Total Bins</p>
        </div>

        <div className="worker-stat-card">
          <h3>{binsToCollect.length}</h3>
          <p>Bins Requiring Collection</p>
        </div>

        <div className="worker-stat-card">
          <h3>{collections.length}</h3>
          <p>Total Collection Records</p>
        </div>
      </div>

      <div className="worker-dashboard-card">
        <h3>Bins Requiring Collection</h3>

        {binsToCollect.length === 0 ? (
          <div className="worker-empty-state">
  <div className="worker-empty-icon">✓</div>
  <h4>All Clear!</h4>
  <p>No bins currently require collection.</p>
  <span>All monitored bins are below the collection threshold.</span>
</div>
        ) : (
          <div className="worker-dashboard-table">
            <table>
              <thead>
  <tr>
    <th>Bin ID</th>
    <th>Location</th>
    <th>Fill Level</th>
    <th>Status</th>
    <th>Action</th>
  </tr>
</thead>

<tbody>
  {binsToCollect.map((bin) => (
    <tr key={bin._id}>
      <td>{bin.binId}</td>
      <td>{bin.location}</td>
      <td>{bin.fillLevel}%</td>
      <td>
        <span className={`worker-status ${bin.status?.toLowerCase()}`}>
          {bin.status}
        </span>
      </td>
      <td>
        <button
          type="button"
          onClick={() => handleCollect(bin.binId)}
        >
          Mark Collected
        </button>
      </td>
    </tr>
  ))}
</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="worker-dashboard-card">
        <h3>Recent Collection History</h3>

        {collections.length === 0 ? (
          <p>No collection records available.</p>
        ) : (
          <div className="worker-dashboard-table">
            <table>
              <thead>
                <tr>
                  <th>Bin ID</th>
                  <th>Location</th>
                  <th>Previous Fill Level</th>
                     <th>Collected By</th>
                  <th>Collected At</th>
                </tr>
              </thead>

              <tbody>
                {collections.slice(0, 10).map((item) => (
                  <tr key={item._id}>
                    <td>{item.binId}</td>
                    <td>{item.location}</td>
                    <td>{item.previousFillLevel}%</td>
                      <td>{item.collectedBy || "Collection Worker"}</td>
  <td>{new Date(item.collectedAt).toLocaleString()}</td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDashboard;
