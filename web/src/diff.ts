export type DiffOp = { kind: 'same' | 'del' | 'add'; text: string };

/** Line diff (longest common subsequence). Files are small (200 Ko at most), so this is plenty. */
export function diffLines(before: string, after: string): DiffOp[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const n = a.length;
  const m = b.length;
  // table[i][j] = length of the LCS of a[i..] and b[j..]
  const table: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: 'same', text: a[i]! });
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      ops.push({ kind: 'del', text: a[i++]! });
    } else {
      ops.push({ kind: 'add', text: b[j++]! });
    }
  }
  while (i < n) ops.push({ kind: 'del', text: a[i++]! });
  while (j < m) ops.push({ kind: 'add', text: b[j++]! });
  return ops;
}
