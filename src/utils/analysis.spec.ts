import { Observable, Observer } from 'rxjs';
import * as _byLine from 'byline';
import { createReadStream } from 'fs';
import { join } from 'path';
import { ASSET_ROOT } from './assets';
import { tap, first } from 'rxjs/operators';
import { analyze } from './analysis';

describe('analyze DI', () => {
  function readByLine(name: string): Observable<string> {
    // create the observable
    return Observable.create((aObserver: Observer<string>) => {
      // open stream for reading
      const stream = createReadStream(join(ASSET_ROOT, 'test', name), {
        encoding: 'utf-8',
      });
      // stdout
      const byLine = _byLine;
      const stdout = byLine(stream);
      // pipe stdout to the target
      stdout.on('data', (line) => aObserver.next(line));
      // error handling
      stdout.once('error', (err) => aObserver.error(err));
      // done
      stdout.once('finish', () => aObserver.complete());

      return () => stream.close();
    });
  }

  it('should read a file line by line', () => {
    const line$ = readByLine('analysis.txt');

    return line$.toPromise();
  });

  it('should analyze', () => {
    const line$ = readByLine('analysis.txt');

    const analysis$ = line$.pipe(
      analyze(),
      first(),
      tap((result) => console.log(JSON.stringify(result, undefined, 2)))
    );

    return analysis$.toPromise();
  });
});
