import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatTableRow {
  label: string;
  value: string | number;
  percentage?: number;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

interface StatTableProps {
  title: string;
  description?: string;
  data: StatTableRow[];
  showPercentage?: boolean;
  className?: string;
}

export const StatTable: React.FC<StatTableProps> = ({
  title,
  description,
  data,
  showPercentage = true,
  className = ''
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((row, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{row.label}</span>
                {row.badge && (
                  <Badge variant={row.badge.variant || 'secondary'} className="text-xs">
                    {row.badge.text}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold">{row.value}</span>
                {showPercentage && row.percentage !== undefined && (
                  <span className="text-xs text-gray-500">
                    ({row.percentage.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatTable;




