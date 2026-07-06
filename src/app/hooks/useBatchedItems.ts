import { useState, useMemo } from 'react';

interface UseBatchedItemsResult<T> {
  batches: T[][];
  currentBatch: T[];
  batchIndex: number;
  totalBatches: number;
  nextBatch: () => void;
  prevBatch: () => void;
  isFirstBatch: boolean;
  isLastBatch: boolean;
  setBatchIndex: (index: number) => void;
}

export function useBatchedItems<T>(items: T[], preferredBatchSize: number): UseBatchedItemsResult<T> {
  const batches = useMemo(() => {
    const result: T[][] = [];
    const len = items.length;
    if (len === 0) return result;

    // Special case for full alphabet (26 or 28 items): always split into 4 batches -> 6,6,7,7 (for 26) or 7,7,7,7 (for 28)
    const numBatches = (len === 26 || len === 28) ? 4 : Math.ceil(len / preferredBatchSize);
    const baseSize = Math.floor(len / numBatches);
    const remainder = len % numBatches;

    let startIndex = 0;
    for (let i = 0; i < numBatches; i++) {
      // Distribute the remainder evenly to the last few batches
      const currentBatchSize = baseSize + (i >= numBatches - remainder ? 1 : 0);
      result.push(items.slice(startIndex, startIndex + currentBatchSize));
      startIndex += currentBatchSize;
    }
    return result;
  }, [items, preferredBatchSize]);

  const [batchIndex, setBatchIndex] = useState(0);

  const totalBatches = batches.length;
  const currentBatch = batches[batchIndex] || [];
  const isFirstBatch = batchIndex === 0;
  const isLastBatch = batchIndex >= totalBatches - 1;

  const nextBatch = () => {
    if (!isLastBatch) {
      setBatchIndex(prev => prev + 1);
    }
  };

  const prevBatch = () => {
    if (!isFirstBatch) {
      setBatchIndex(prev => prev - 1);
    }
  };

  return {
    batches,
    currentBatch,
    batchIndex,
    totalBatches,
    nextBatch,
    prevBatch,
    isFirstBatch,
    isLastBatch,
    setBatchIndex
  };
}
