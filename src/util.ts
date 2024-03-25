type CompareTypes = boolean | number | string | undefined

function compare(a: CompareTypes | CompareTypes[], b: CompareTypes | CompareTypes[]): number {
  const itemA = a === undefined ? 0 : a
  const itemB = b === undefined ? 0 : b

  if (Array.isArray(itemA) && Array.isArray(itemB)) {
    if (itemA.length === 0 && itemB.length === 0) return 0
    const diff = compare(itemA[0], itemB[0])
    if (diff !== 0) return diff
    return compare(itemA.slice(1), itemB.slice(1))
  }

  if (itemA < itemB) return -1
  if (itemA > itemB) return 1
  return 0
}

export function sortBy<T>(arr: T[], fn: (i: T) => CompareTypes | CompareTypes[]): T[] {
  return arr.sort((a, b) => compare(fn(a), fn(b)))
}

export function uniq<T>(arr: T[]): T[] {
  return arr.filter((a, i) => arr.indexOf(a) === i)
}

export function uniqWith<T>(arr: T[], fn: (a: T, b: T) => boolean): T[] {
  return arr.filter((a, i) => !arr.some((b, j) => j > i && fn(a, b)))
}
