
import React, { useEffect, useState } from "react";
import API from "../services/api";
import "./WorkerManagement.css";

const WorkerManagement = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  // Fetch all workers
  const fetchWorkers = async () => {
    try {
      const response = await API.get("/auth/workers");
      setWorkers(response.data.workers || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load workers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // Handle form inputs
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Create new worker
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setAdding(true);

    try {
      const response = await API.post("/auth/workers", formData);

      setMessage(response.data.message);

      setFormData({
        name: "",
        email: "",
        password: ""
      });

      await fetchWorkers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create worker."
      );
    } finally {
      setAdding(false);
    }
  };

  // Activate or deactivate worker
  const toggleWorkerStatus = async (workerId, currentStatus) => {
    setMessage("");
    setError("");

    try {
      const response = await API.patch(
        `/auth/workers/${workerId}/status`,
        { isActive: !currentStatus }
      );

      setMessage(response.data.message);
      await fetchWorkers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to update worker status."
      );
    }
  };

  return (
    <div className="worker-management">

      {/* Header */}
      <div className="worker-header">
        <div>
          <h2>Worker Management</h2>
          <p>Create and manage your collection workers.</p>
        </div>

        <div className="worker-count">
          <span>Total Workers</span>
          <strong>{workers.length}</strong>
        </div>
      </div>

      {/* Add Worker Form */}
      <div className="worker-form-card">
        <h3>Add New Worker</h3>

        <form onSubmit={handleSubmit}>
          <div className="worker-form-grid">

            <div className="worker-field">
              <label>Worker Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter worker name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="worker-field">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="worker-field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                required
              />
            </div>

          </div>

          <button type="submit" disabled={adding}>
            {adding ? "Creating..." : "+ Add Worker"}
          </button>
        </form>

        {message && (
          <p className="worker-success">{message}</p>
        )}

        {error && (
          <p className="worker-error">{error}</p>
        )}
      </div>

      {/* Registered Workers Table */}
      <div className="worker-table-card">
        <h3>Registered Workers</h3>

        {loading ? (
          <p>Loading workers...</p>
        ) : workers.length === 0 ? (
          <p>No workers registered yet.</p>
        ) : (
          <div className="worker-table-wrapper">

            <table>
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {workers.map((worker) => (
                  <tr key={worker._id}>

                    <td>{worker.name}</td>

                    <td>{worker.email}</td>

                    <td>Collection Worker</td>

                    <td>
                      <span
                        className={
                          worker.isActive
                            ? "worker-status active"
                            : "worker-status inactive"
                        }
                      >
                        {worker.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={
                          worker.isActive
                            ? "deactivate-btn"
                            : "activate-btn"
                        }
                        onClick={() =>
                          toggleWorkerStatus(
                            worker._id,
                            worker.isActive
                          )
                        }
                      >
                        {worker.isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>

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

export default WorkerManagement;
