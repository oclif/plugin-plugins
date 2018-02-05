export function sortBy<T>(arr: T[], fn: (i: T) => sortBy.Types | sortBy.Types[]): T[] {
  function compare(a: sortBy.Types | sortBy.Types[], b: sortBy.Types | sortBy.Types[]): number {
    a = a === undefined ? 0 : a
    b = b === undefined ? 0 : b

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length === 0 && b.length === 0) return 0
      let diff = compare(a[0], b[0])
      if (diff !== 0) return diff
      return compare(a.slice(1), b.slice(1))
    }

    if (a < b) return -1
    if (a > b) return 1
    return 0
  }

  return arr.sort((a, b) => compare(fn(a), fn(b)))
}
export namespace sortBy {
  export type Types = string | number | undefined | boolean
}

export function uniq<T>(arr: T[]): T[] {
  return arr.filter((a, i) => {
    return !arr.find((b, j) => j !== i && b === a)
  })
}

export function uniqWith<T>(arr: T[], fn: (a: T, b: T) => boolean): T[] {
  return arr.filter((a, i) => {
    return !arr.find((b, j) => j !== i && fn(a, b))
  })
}
