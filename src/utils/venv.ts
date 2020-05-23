import { PathLike, stat, Stats } from 'fs';
import { join, parse } from 'path';
import { bindNodeCallback, Observable, of } from 'rxjs';
import { catchError, mapTo, mergeMap } from 'rxjs/operators';

/**
 * Marker file that denotes the root of a virtual environment
 */
const VENV_MARKER = 'pyvenv.cfg';

const rxStat = bindNodeCallback<PathLike, Stats>(stat);

function getVEnvDir(aDir: string): Observable<string | undefined> {
  const name = join(aDir, VENV_MARKER);
  return rxStat(name).pipe(
    mapTo(aDir),
    catchError(() => of(undefined))
  );
}

/**
 * Tests if the filename is inside a virtual environment
 *
 * @param aName - the name of the file, must be a full name
 *
 * @returns path to the virtual environment or undefined
 */
export function getVirtualEnvironment(
  aName: string,
  aRoot: string
): Observable<string | undefined> {
  // split
  const { dir } = parse(aName);
  return dir === aRoot
    ? of(undefined)
    : getVEnvDir(dir).pipe(
        mergeMap((result) =>
          result ? of(result) : getVirtualEnvironment(dir, aRoot)
        )
      );
}
