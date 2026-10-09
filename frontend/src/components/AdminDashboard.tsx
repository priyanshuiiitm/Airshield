import React from 'react';

interface AdminDashboardProps {
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  return (
    <div className="admin-dashboard-container" style={{ padding: '2rem', color: '#e2e8f0', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <button 
        onClick={onBack} 
        style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.375rem', marginBottom: '2rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        ← Back to Worker App
      </button>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, color: '#38bdf8' }}>Fleet Manager Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '1.1rem' }}>Aggregated AirShield analytics across 1,240 simulated trips in Delhi NCR.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#1e293b', padding: '0.5rem 1rem', borderRadius: '9999px', border: '1px solid #334155' }}>
          <div style={{ width: 8, height: 8, backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1' }}>Live B2B Sync</span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Modelled Trips</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>1,240</div>
          <div style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.75rem', fontWeight: 500 }}>↑ 12% this week</div>
        </div>
        
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Avoidable Exposure</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#38bdf8', lineHeight: 1 }}>37%</div>
          <div style={{ color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.75rem' }}>Trips successfully re-routed</div>
        </div>
        
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Median Reduction</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>31%</div>
          <div style={{ color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.75rem' }}>Fleet-wide PM2.5 exposure reduced</div>
        </div>
        
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
          <h3 style={{ color: '#94a3b8', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0' }}>Cost to Mitigate</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fbbf24', lineHeight: 1 }}>2.4m</div>
          <div style={{ color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.75rem' }}>Median extra minutes per safe trip</div>
        </div>
      </div>

      <div style={{ backgroundColor: '#1e293b', padding: '2rem', borderRadius: '0.75rem', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 1.5rem 0' }}>Buffer Sensitivity Analysis (Policy Trade-off)</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.5 }}>Demonstrates that the platform can tune the time-buffer tolerance to choose the exact trade-off between operational efficiency and worker health.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem 0' }}>Policy Buffer</th>
              <th style={{ padding: '1rem 0' }}>Avoidable Trips Caught</th>
              <th style={{ padding: '1rem 0' }}>Status</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '1rem', color: '#e2e8f0' }}>
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '1rem 0', fontWeight: 500 }}>3 min</td>
              <td style={{ padding: '1rem 0', color: '#fbbf24', fontWeight: 700 }}>18%</td>
              <td style={{ padding: '1rem 0', color: '#94a3b8' }}>Low Coverage</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '1rem 0', fontWeight: 500 }}>5 min <span style={{ backgroundColor: '#3b82f6', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>CURRENT</span></td>
              <td style={{ padding: '1rem 0', color: '#38bdf8', fontWeight: 700 }}>31%</td>
              <td style={{ padding: '1rem 0', color: '#94a3b8' }}>Optimal Balance</td>
            </tr>
            <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <td style={{ padding: '1rem 0', fontWeight: 500 }}>8 min</td>
              <td style={{ padding: '1rem 0', color: '#34d399', fontWeight: 700 }}>44%</td>
              <td style={{ padding: '1rem 0', color: '#94a3b8' }}>High Coverage</td>
            </tr>
            <tr>
              <td style={{ padding: '1rem 0', fontWeight: 500 }}>10 min</td>
              <td style={{ padding: '1rem 0', color: '#10b981', fontWeight: 800 }}>51%</td>
              <td style={{ padding: '1rem 0', color: '#94a3b8' }}>Maximum Health Policy</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
