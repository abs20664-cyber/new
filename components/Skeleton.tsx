import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-sm bg-gold/5 border border-gold/10 ${className}`}
      {...props}
    />
  );
};

export { Skeleton };
