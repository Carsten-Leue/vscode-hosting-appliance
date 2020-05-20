import { PathLike, stat, Stats } from 'fs';
import { join, parse } from 'path';
import { bindNodeCallback, Observable, of } from 'rxjs';
import { catchError, mapTo, mergeMap } from 'rxjs/operators';

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
 * @param aName - the name
 *
 * @returns true if it's in a virtual environment, else false
 */
export function getVirtualEnvironment(
  aName: string,
  aRoot: string
): Observable<string | undefined> {
  console.log('name', aName, 'root', aRoot);
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
