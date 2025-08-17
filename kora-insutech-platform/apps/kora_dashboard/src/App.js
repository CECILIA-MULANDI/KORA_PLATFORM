import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [devices, setDevices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, devicesRes, incidentsRes, companiesRes] = await Promise.all([
        axios.get('/api/kora/dashboard'),
        axios.get('/api/kora/devices'),
        axios.get('/api/kora/incidents?limit=20'),
        axios.get('/api/kora/companies')
      ]);

      setDashboardData(overviewRes.data);
      setDevices(devicesRes.data.devices || []);
      setIncidents(incidentsRes.data.incidents || []);
      setCompanies(companiesRes.data.companies || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 10 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h2>Loading KORA Dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="kora-header">
        <div className="header-content">
          <h1>🔍 KORA Dashboard</h1>
          <p>Insurance Transparency & IoT Monitoring Platform</p>
          <div className="live-indicator">
            <span className="live-dot"></span>
            LIVE MONITORING
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={activeTab === 'devices' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('devices')}
        >
          📱 Devices
        </button>
        <button 
          className={activeTab === 'incidents' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('incidents')}
        >
          🚨 Incidents
        </button>
        <button 
          className={activeTab === 'companies' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('companies')}
        >
          🏢 Companies
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h2>System Overview</h2>
            {dashboardData && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>{dashboardData.system_stats.insurance_companies}</h3>
                  <p>Insurance Companies</p>
                </div>
                <div className="stat-card">
                  <h3>{dashboardData.system_stats.iot_devices_registered}</h3>
                  <p>IoT Devices Registered</p>
                </div>
                <div className="stat-card">
                  <h3>{dashboardData.system_stats.total_incidents}</h3>
                  <p>Total Incidents Detected</p>
                </div>
                <div className="stat-card">
                  <h3>{dashboardData.system_stats.active_monitored_devices}</h3>
                  <p>Active Monitored Devices</p>
                </div>
              </div>
            )}
            
            {dashboardData && (
              <div className="transparency-metrics">
                <h3>Transparency Metrics</h3>
                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="metric-label">Blockchain Verified Companies:</span>
                    <span className="metric-value">{dashboardData.transparency_metrics.blockchain_verified_companies}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Immutable Incident Records:</span>
                    <span className="metric-value">{dashboardData.transparency_metrics.immutable_incident_records}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Policy Integrity Hashes:</span>
                    <span className="metric-value">{dashboardData.transparency_metrics.policy_integrity_hashes}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="devices-section">
            <h2>Real-time Device Monitoring</h2>
            <div className="devices-grid">
              {devices.map((device, index) => (
                <div key={index} className="device-card">
                  <div className="device-header">
                    <h3>{device.device_id}</h3>
                    <span className={`status-badge ${device.status}`}>
                      {device.blockchain_verified ? '⛓️' : '❌'} {device.status}
                    </span>
                  </div>
                  
                  {device.policy_info && (
                    <div className="policy-info">
                      <p><strong>Policy:</strong> {device.policy_info.policy_number}</p>
                      <p><strong>Holder:</strong> {device.policy_info.policy_holder}</p>
                      <p><strong>Type:</strong> {device.policy_info.policy_type}</p>
                    </div>
                  )}
                  
                  <div className="company-info">
                    <p><strong>Company:</strong> {device.insurance_company.name}</p>
                  </div>
                  
                  <div className="incident-summary">
                    <p><strong>Total Incidents:</strong> {device.incident_summary.total_incidents}</p>
                    {device.incident_summary.last_incident && (
                      <p><strong>Last Incident:</strong> {new Date(device.incident_summary.last_incident).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="incidents-section">
            <h2>Recent Incidents</h2>
            <div className="incidents-list">
              {incidents.map((incident, index) => (
                <div key={index} className={`incident-card severity-${incident.severity}`}>
                  <div className="incident-header">
                    <h3>{incident.incident_type.toUpperCase()}</h3>
                    <span className={`severity-badge ${incident.severity}`}>
                      {incident.severity}
                    </span>
                  </div>
                  
                  <div className="incident-details">
                    <p><strong>Device:</strong> {incident.device_info.device_id}</p>
                    {incident.policy_info && (
                      <>
                        <p><strong>Policy:</strong> {incident.policy_info.policy_number}</p>
                        <p><strong>Customer:</strong> {incident.policy_info.policy_holder}</p>
                      </>
                    )}
                    <p><strong>Company:</strong> {incident.insurance_company.name}</p>
                    <p><strong>Time:</strong> {new Date(incident.timestamp).toLocaleString()}</p>
                    
                    {incident.incident_details && (
                      <div className="speed-details">
                        <p><strong>Speed:</strong> {incident.incident_details.speed_kmh} km/h</p>
                        <p><strong>Limit:</strong> {incident.incident_details.threshold} km/h</p>
                        <p><strong>Excess:</strong> +{incident.incident_details.excess_speed} km/h</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="transparency-status">
                    <div className="status-item">
                      <span className={incident.transparency_status.blockchain_recorded ? 'status-success' : 'status-pending'}>
                        {incident.transparency_status.blockchain_recorded ? '✅' : '⏳'} Blockchain Recorded
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-success">✅ Company Notified</span>
                    </div>
                    <div className="status-item">
                      <span className="status-success">✅ KORA Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="companies-section">
            <h2>Insurance Company Transparency</h2>
            <div className="companies-grid">
              {companies.map((company, index) => (
                <div key={index} className="company-card">
                  <div className="company-header">
                    <h3>{company.company_name}</h3>
                    <span className={`verification-badge ${company.blockchain_verified ? 'verified' : 'unverified'}`}>
                      {company.blockchain_verified ? '✅ Verified' : '❌ Unverified'}
                    </span>
                  </div>
                  
                  <div className="company-metrics">
                    <p><strong>Devices Monitored:</strong> {company.transparency_metrics.total_devices_monitored}</p>
                    <p><strong>Total Policies:</strong> {company.transparency_metrics.total_policies}</p>
                    <p><strong>Blockchain Policies:</strong> {company.transparency_metrics.policies_with_blockchain_hash}</p>
                    <p><strong>Incidents Detected:</strong> {company.transparency_metrics.total_incidents_detected}</p>
                  </div>
                  
                  <div className="transparency-scores">
                    <div className="score-item">
                      <span>Blockchain Integration:</span>
                      <span className="score">{company.transparency_score.blockchain_integration}%</span>
                    </div>
                    <div className="score-item">
                      <span>Policy Transparency:</span>
                      <span className="score">{company.transparency_score.policy_transparency}%</span>
                    </div>
                    <div className="score-item">
                      <span>Incident Transparency:</span>
                      <span className="score">{company.transparency_score.incident_transparency}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="kora-footer">
        <p>🔍 KORA - Ensuring Insurance Transparency Through Blockchain & IoT</p>
        <p>Last Updated: {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
}

export default App;
