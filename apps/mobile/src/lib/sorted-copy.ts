export function sortedCopy<T>(
  items: readonly T[],
  compare: (left: T, right: T) => number,
): T[] {
  const result: T[] = [];

  for (const item of items) {
    let insertAt = result.length;
    while (insertAt > 0) {
      const previous = result[insertAt - 1];
      if (previous === undefined || compare(previous, item) <= 0) {
        break;
      }
      insertAt--;
    }
    result.splice(insertAt, 0, item);
  }

  return result;
}
