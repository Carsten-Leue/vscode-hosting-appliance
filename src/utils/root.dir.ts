import { PathLike, stat, Stats } from 'fs';
import { dirname, join } from 'path';
import {
  bindNodeCallback,
  combineLatest,
  Observable,
  of,
  throwError,
} from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

const rxStat = bindNodeCallback<PathLike, Stats>(stat);

/**
 * Locates the file in the parent directory or bails out
 *
 * @param aDir - the directory
 * @returns the observable
 */
function resolveParentDir(aDir: string): Observable<string> {
  // compute the name of the directory
  const parentDir = dirname(aDir);
  // recurse
  return parentDir === aDir
    ? throwError(new Error('Unable to root dir'))
    : internalFindRoot(parentDir);
}

/**
 * Locates the package json relative to the given directory
 *
 * @param aDir - the starting directory or the name of the package json
 * @returns the name of the package json or an error
 */
function internalFindRoot(aDir: string): Observable<string> {
  // candidate name
  const setupName = join(aDir, 'setup.py');
  const bumpName = join(aDir, '.bumpversion.cfg');
  // the stats
  const stat$ = combineLatest([rxStat(setupName), rxStat(bumpName)]).pipe(
    map(([setupStat, bumpStat]) => setupStat.isFile() && bumpStat.isFile()),
    catchError(() => of(false))
  );
  // resolve
  return stat$.pipe(mergeMap((ok) => (ok ? of(aDir) : resolveParentDir(aDir))));
}

export function findRootDir(aDir: string): Observable<string> {
  return internalFindRoot(aDir);
}
