import React from 'react';

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  showPercentage?: boolean;
  showValue?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  className?: string;
}

const colorClasses = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  red: 'bg-red-600',
  yellow: 'bg-yellow-600',
  purple: 'bg-purple-600',
  gray: 'bg-gray-600'
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  total,
  showPercentage = true,
  showValue = true,
  color = 'blue',
  className = ''
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClass = colorClasses[color];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center space-x-2">
          {showValue && (
            <span className="text-sm text-gray-600">
              {value.toLocaleString()} / {total.toLocaleString()}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-600">
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClass} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;




