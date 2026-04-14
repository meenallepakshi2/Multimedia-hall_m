import './StatusBadge.css';

const StatusBadge = ({ status }) => {
  return <span className={`status-badge ${status}`}>{status}</span>;
};

export default StatusBadge;
