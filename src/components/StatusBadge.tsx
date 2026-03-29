import React from 'react';
import { ReportStatus, Priority } from '../types';

interface StatusBadgeProps {
  status?: ReportStatus | string;
  priority?: Priority | string;
  type: 'status' | 'priority' | 'role';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, priority, type }) => {
  let colorClass = 'bg-gray-100 text-gray-600';
  let label = '';

  if (type === 'status' && status) {
    label = status;
    switch (status) {
      case ReportStatus.PENDING:
        colorClass = 'bg-orange-100 text-orange-600';
        break;
      case ReportStatus.IN_PROCESS:
        colorClass = 'bg-blue-100 text-blue-600';
        break;
      case ReportStatus.RESOLVED:
        colorClass = 'bg-green-100 text-green-600';
        break;
      default:
        break;
    }
  } else if (type === 'priority' && priority) {
    label = priority;
    switch (priority) {
      case Priority.HIGH:
        colorClass = 'bg-orange-500 text-white';
        break;
      case Priority.MEDIUM:
        colorClass = 'bg-blue-400 text-white';
        break;
      case Priority.LOW:
        colorClass = 'bg-gray-400 text-white';
        break;
      case Priority.UNASSIGNED:
        colorClass = 'bg-gray-200 text-gray-500';
        break;
      default:
        break;
    }
  } else if (type === 'role') {
    label = status || ''; 
    // Reusing prop for label in role case
    if (label === 'Administrador') colorClass = 'bg-red-500 text-white';
    if (label === 'Supervisor') colorClass = 'bg-blue-600 text-white';
    if (label === 'Investigador') colorClass = 'bg-cyan-500 text-white';
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${colorClass}`}>
      {label}
    </span>
  );
};

export default StatusBadge;