// components/common/sidebar/sidebar.tsx
import { useNavigate, useLocation } from "react-router-dom";
import "./sidebar.css";
import icons from "../../../assets/icons";
import { useRole } from "../../../hooks";
import { useHealthMetrics } from "../../../hooks";
import { useAppContext } from "../../../context/AppContext";
import { 
  formatPercentage, 
  formatBytes, 
  getChangeType, 
  getMetricIcon,
  calculatePreviousValue,
  calculateChange 
} from "../../../utils/metricsUtils";
import { useEffect, useState } from "react";

interface Metric {
  icon: string;
  value: string;
  label: string;
  change: string;
  changeType: "positive" | "negative";
}

interface MenuItem {
  label: string;
  icon: keyof typeof icons;
  path: string;
  count?: number;
  alert?: boolean;
  roles: ('admin' | 'viewer')[];
  modes: ('server' | 'network')[];
}

const allMenuItems: MenuItem[] = [
  { label: 'Configuration', icon: 'config', path: '/', count: 12, roles: ['admin'], modes: ['server', 'network'] },
  { label: 'Health', icon: 'health', path: '/health', roles: ['admin', 'viewer'], modes: ['server', 'network'] },
  { label: 'Monitoring & Alerts', icon: 'reports', path: '/alert', count: 3, alert: true, roles: ['admin', 'viewer'], modes: ['server', 'network'] },
  { label: 'Resource Optimization', icon: 'resource', path: '/resource', count: 8, roles: ['admin'], modes: ['server'] }, // Only for server
  { label: 'Logging Systems', icon: 'logg', path: '/log', count: 156, roles: ['admin', 'viewer'], modes: ['server', 'network'] },
  { label: 'Backup Management', icon: 'backup', path: '/backup', count: 5, roles: ['admin'], modes: ['network'] }, // Only for network
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isAdmin } = useRole();
  const { activeMode } = useAppContext();
  const { metrics, healthData, loading, error, refreshMetrics } = useHealthMetrics();
  
  // Store previous values for change calculation
  const [previousMetrics, setPreviousMetrics] = useState<{
    cpu: number;
    ram: number;
    disk: number;
    network: number;
  } | null>(null);

  // Update previous metrics when new data comes in
  useEffect(() => {
    if (metrics && !previousMetrics) {
      // Initialize previous metrics with slight variations for demo
      setPreviousMetrics({
        cpu: calculatePreviousValue(metrics.cpu),
        ram: calculatePreviousValue(metrics.ram),
        disk: calculatePreviousValue(metrics.disk),
        network: calculatePreviousValue(metrics.network)
      });
    }
  }, [metrics, previousMetrics]);

  // Filter menu items based on user role AND active mode
  const menuItems = allMenuItems.filter(item => 
    role && item.roles.includes(role) && item.modes.includes(activeMode)
  );

  // Generate dynamic metrics based on health data
  const getDynamicMetrics = (): Metric[] => {
    if (loading) {
      return [
        { icon: '⏳', value: 'Loading...', label: 'CPU Usage', change: '0%', changeType: 'positive' },
        { icon: '⏳', value: 'Loading...', label: 'RAM Usage', change: '0%', changeType: 'positive' },
        { icon: '⏳', value: 'Loading...', label: 'Disk Usage', change: '0%', changeType: 'positive' },
        { icon: '⏳', value: 'Loading...', label: 'Network I/O', change: '0%', changeType: 'positive' },
      ];
    }

    if (error) {
      return [
        { icon: '❌', value: 'Error', label: 'CPU Usage', change: '0%', changeType: 'negative' },
        { icon: '❌', value: 'Error', label: 'RAM Usage', change: '0%', changeType: 'negative' },
        { icon: '❌', value: 'Error', label: 'Disk Usage', change: '0%', changeType: 'negative' },
        { icon: '❌', value: 'Error', label: 'Network I/O', change: '0%', changeType: 'negative' },
      ];
    }

    if (!metrics || !healthData) {
      return [
        { icon: '📊', value: 'N/A', label: 'CPU Usage', change: '0%', changeType: 'positive' },
        { icon: '📊', value: 'N/A', label: 'RAM Usage', change: '0%', changeType: 'positive' },
        { icon: '📊', value: 'N/A', label: 'Disk Usage', change: '0%', changeType: 'positive' },
        { icon: '📊', value: 'N/A', label: 'Network I/O', change: '0%', changeType: 'positive' },
      ];
    }

    const cpuChange = previousMetrics ? calculateChange(metrics.cpu, previousMetrics.cpu) : '+0%';
    const ramChange = previousMetrics ? calculateChange(metrics.ram, previousMetrics.ram) : '+0%';
    const diskChange = previousMetrics ? calculateChange(metrics.disk, previousMetrics.disk) : '+0%';
    const networkChange = previousMetrics ? calculateChange(metrics.network, previousMetrics.network) : '+0%';

    return [
      {
        icon: getMetricIcon('cpu'),
        value: formatPercentage(metrics.cpu),
        label: 'CPU Usage',
        change: cpuChange,
        changeType: getChangeType(metrics.cpu, { warning: 70, critical: 90 })
      },
      {
        icon: getMetricIcon('ram'),
        value: formatPercentage(metrics.ram),
        label: 'RAM Usage',
        change: ramChange,
        changeType: getChangeType(metrics.ram, { warning: 80, critical: 95 })
      },
      {
        icon: getMetricIcon('disk'),
        value: formatPercentage(metrics.disk),
        label: 'Disk Usage',
        change: diskChange,
        changeType: getChangeType(metrics.disk, { warning: 85, critical: 95 })
      },
      {
        icon: getMetricIcon('network'),
        value: formatBytes(metrics.network * 1024 * 1024), // Convert MB to bytes for formatting
        label: 'Network I/O',
        change: networkChange,
        changeType: 'positive' // Network I/O is generally neutral
      }
    ];
  };

  const dynamicMetrics = getDynamicMetrics();

  return (
    <div className="sidebar-container">
      <div className="metrics-header">
          <button 
            className="metrics-refresh-btn"
            onClick={refreshMetrics}
            disabled={loading}
            title="Refresh metrics"
          >
            Refresh
          </button>
        </div>
      <div className="metrics-section">
        {/* Refresh button for metrics */}
        
        
        {dynamicMetrics.map((metric, index) => (
          <div key={index} className={`metric-card metric-${index}`}>
            <div className="metric-change" data-type={metric.changeType}>
              {metric.change}
            </div>
            <div className="metric-value">{metric.value}</div>
            <div className="metric-label">{metric.label}</div>
          </div>
        ))}
        
        {/* Error indicator */}
        {error && (
          <div className="metrics-error">
            <small>Failed to load metrics</small>
          </div>
        )}
      </div>

      <div className="menu-section">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;

          return (
            <div
              key={index}
              className={`menu-item ${isActive ? "active-blue" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <img
                src={icons[item.icon]}
                alt={item.label}
                className="menu-icon"
              />
              <span className="menu-label">{item.label}</span>
              {item.count !== undefined && (
                <span className={`menu-count ${item.alert ? "alert" : ""}`}>
                  {item.count}
                </span>
              )}
            </div>
          );
        })}

        {/* Settings - Only for Admin */}
        {isAdmin && (
          <div
            className={`menu-item settings-button ${location.pathname === "/settings" ? "active-blue" : ""}`}
            onClick={() => navigate("/settings")}
          >
            <img src={icons.settings} alt="Settings" className="menu-icon" />
            <span className="menu-label">Settings</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
