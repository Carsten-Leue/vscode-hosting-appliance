import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { rxSpawn, SPAWN_OUTPUT_TYPE } from './shell';

/**
 * Locates file with the specified name on the remote LPAR using SSH
 *
 * @param aName - name of the file to find
 * @param aLpar - identifier of the LPAR, we assume that `ssh LPAR` works
 *
 * @returns an observable of the lines
 */
export function findFile(aName: string, aLpar: string): Observable<string> {
  // build the command
  const finder = `find /usr/lib /usr/local/lib /var/www/api /usr/local/zACI/test/unittests -name "${aName}"`;
  // dispatch
  return rxSpawn('ssh', [aLpar, finder]).pipe(
    filter(([type]) => type === SPAWN_OUTPUT_TYPE.STDOUT),
    map(([, line]) => line),
    map((line) => line.trim()),
    filter((line) => line.length > 0)
  );
}
