export type DiffOp = 
  | { type: 'equal'; value: string }
  | { type: 'insert'; value: string }
  | { type: 'delete'; value: string };

export function calculateDiff(text1: string, text2: string, windowSize: number = 8): DiffOp[] {
  // Split by whitespace and remove empty strings to compare purely by word
  const tokens1 = text1.split(/\s+/).filter(Boolean);
  const tokens2 = text2.split(/\s+/).filter(Boolean);
  
  const diff: DiffOp[] = [];
  let i = 0;
  let j = 0;

  while (i < tokens1.length && j < tokens2.length) {
    if (tokens1[i] === tokens2[j]) {
      diff.push({ type: 'equal', value: tokens1[i] });
      i++;
      j++;
    } else {
      // Lookahead window to find next match
      // We look ahead to find the closest matching tokens to minimize diff size
      let matchFound = false;
      let bestK = -1;
      let bestL = -1;
      
      // Search in window W. Prioritize closer matches (w is distance).
      for (let w = 1; w <= windowSize; w++) {
        for (let k = 0; k <= w && !matchFound; k++) {
          const l = w - k;
          if (i + k < tokens1.length && j + l < tokens2.length) {
            if (tokens1[i + k] === tokens2[j + l]) {
              bestK = k;
              bestL = l;
              matchFound = true;
            }
          }
        }
      }

      if (matchFound) {
        // Add all skipped tokens in text1 as deletions
        for (let x = 0; x < bestK; x++) {
          diff.push({ type: 'delete', value: tokens1[i + x] });
        }
        // Add all skipped tokens in text2 as insertions
        for (let y = 0; y < bestL; y++) {
          diff.push({ type: 'insert', value: tokens2[j + y] });
        }
        i += bestK;
        j += bestL;
      } else {
        // No match in window, treat current tokens as substituted
        diff.push({ type: 'delete', value: tokens1[i] });
        diff.push({ type: 'insert', value: tokens2[j] });
        i++;
        j++;
      }
    }
  }

  // Handle remaining tokens at the end
  while (i < tokens1.length) {
    diff.push({ type: 'delete', value: tokens1[i] });
    i++;
  }
  while (j < tokens2.length) {
    diff.push({ type: 'insert', value: tokens2[j] });
    j++;
  }

  // Combine adjacent operations of the same type for a cleaner output
  return diff.reduce((acc, curr) => {
    if (acc.length === 0) return [curr];
    const last = acc[acc.length - 1];
    if (last.type === curr.type) {
      last.value += curr.value;
      return acc;
    }
    return [...acc, curr];
  }, [] as DiffOp[]);
}
