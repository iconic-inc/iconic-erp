import { Progress } from './progress';

interface ProgressWithPercentageProps {
  value: number;
  className?: string;
  showPercentage?: boolean;
  showLabel?: boolean;
  label?: string;
}

export function ProgressWithPercentage({
  value,
  className = '',
  showPercentage = true,
  showLabel = false,
  label,
}: ProgressWithPercentageProps) {
  const percentage = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && label && (
        <div className='flex justify-between items-center'>
          <span className='text-sm font-medium text-gray-700'>{label}</span>
          {showPercentage && (
            <span className='text-sm text-gray-500'>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className='relative'>
        <Progress
          value={percentage}
          className={'w-full' + (showPercentage && !showLabel ? ' h-4' : '')}
        />
        {showPercentage && !showLabel && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <span className='text-xs font-medium text-gray-700 mix-blend-difference text-white'>
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
