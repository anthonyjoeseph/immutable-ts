import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import { insertAt } from 'fp-ts/Array'
import * as L from 'monocle-ts/lib/Lens'
import * as Op from 'monocle-ts/lib/Optional'
import { lensFromPath, optionalFromPath } from './monocle'
import type { Paths } from './types/Paths'
import type { Build } from './types/Build'
import type { Inferable } from './types/utils'

const isPathLens = (
  path: readonly (number | string | readonly string[] | ((a: never) => boolean))[]
): path is (string | readonly string[])[] =>
  !path.some(
    (p) =>
      typeof p === 'function' ||
      (typeof p === 'number' && p !== 0) ||
      (typeof p === 'string' && p.startsWith('?'))
  )

export const insert =
  <
    Infer,
    Path extends Paths<Infer, 'insert'> extends Inferable
      ? [...Paths<Infer, 'insert'>]
      : never,
    Val
  >(
    fullPath: Path,
    val: Val
  ) =>
  (a: Infer): Build<Path, Infer, Val, 'insert'> => {
    const path = fullPath.slice(0, fullPath.length - 1)
    const final = fullPath[fullPath.length - 1]
    if (typeof final === 'number' && final > 0) {
      const b = pipe(
        optionalFromPath(path),
        Op.modify((a) =>
          pipe(
            a,
            insertAt(final as number, val),
            O.getOrElse(() => a)
          )
        )
      )(a)
      return b as Build<Path, Infer, Val>
    }
    if (isPathLens(path)) {
      return pipe(
        lensFromPath(path),
        L.modify((obj) =>
          Array.isArray(obj[final])
            ? { ...obj, [final as string]: [...obj[final], val] }
            : Array.isArray(obj)
            ? [val, ...obj]
            : { ...obj, [final as string]: val }
        )
      )(a) as Build<Path, Infer, Val>
    }
    return pipe(
      optionalFromPath(path),
      Op.modify((obj) =>
        Array.isArray(obj[final])
          ? final === 0
            ? [val, ...obj]
            : { ...obj, [final as string]: [...obj[final], val] }
          : { ...obj, [final as string]: val }
      )
    )(a) as Build<Path, Infer, Val>
  }
