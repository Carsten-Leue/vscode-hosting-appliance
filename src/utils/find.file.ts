import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { rxSpawn, SPAWN_OUTPUT_TYPE } from './shell';

export function findFile(aName: string, aLpar: string): Observable<string> {
  // build the command
  const finder = `find /usr -name "${aName}"`;
  // dispatch
  return rxSpawn('ssh', [aLpar, finder]).pipe(
    filter(([type]) => type === SPAWN_OUTPUT_TYPE.STDOUT),
    map(([, line]) => line),
    map((line) => line.trim()),
    filter((line) => line.length > 0)
  );
}
