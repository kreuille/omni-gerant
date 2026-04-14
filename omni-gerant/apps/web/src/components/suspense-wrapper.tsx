'use client';

import { Suspense, type ReactNode } from 'react';

// BUSINESS RULE [CDC-4]: Suspense wrapper avec skeleton loading

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  lines?: number;
  type?: 'card' | 'table' | 'list' | 'chart';
}

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="h-4 rounded bg-gray-200 animate-pulse"
      style={{ width }}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-6 space-y-4">
      <SkeletonLine width="40%" />
      <SkeletonLine width="60%" />
      <div className="h-8 rounded bg-gray-200 animate-pulse" />
      <SkeletonLine width="80%" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="bg-gray-50 p-4 flex gap-4">
        <SkeletonLine width="20%" />
        <SkeletonLine width="30%" />
        <SkeletonLine width="15%" />
        <SkeletonLine width="15%" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-t p-4 flex gap-4">
          <SkeletonLine width="20%" />
          <SkeletonLine width="30%" />
          <SkeletonLine width="15%" />
          <SkeletonLine width="15%" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="60%" />
            <SkeletonLine width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-6 space-y-4">
      <SkeletonLine width="30%" />
      <div className="h-64 bg-gray-100 rounded animate-pulse flex items-end gap-2 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t animate-pulse"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function DefaultSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} width={`${60 + Math.floor(Math.random() * 40)}%`} />
      ))}
    </div>
  );
}

export function SuspenseWrapper({
  children,
  fallback,
  lines = 3,
  type,
}: SuspenseWrapperProps) {
  const skeleton = fallback ?? (
    type === 'card' ? <CardSkeleton /> :
    type === 'table' ? <TableSkeleton /> :
    type === 'list' ? <ListSkeleton /> :
    type === 'chart' ? <ChartSkeleton /> :
    <DefaultSkeleton lines={lines} />
  );

  return <Suspense fallback={skeleton}>{children}</Suspense>;
}

export { CardSkeleton, TableSkeleton, ListSkeleton, ChartSkeleton };
