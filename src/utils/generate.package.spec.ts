import { tap, reduce } from 'rxjs/operators';
import { join } from 'path';
import { ASSET_ROOT } from './assets';
import { generatePackage } from './generate.package';
import { assert } from 'console';

describe('ssh config', () => {
  const TEST_ROOT = join(ASSET_ROOT, 'test', 'sample_project');

  it('should generate a package file', () => {
    const files$ = generatePackage(TEST_ROOT, 'api');

    const key = join('api', '_internal', '__init__.py');

    return files$
      .pipe(
        reduce(
          (dst: Record<string, string>, [path, data]) => ({
            ...dst,
            [path]: data,
          }),
          {}
        ),
        tap((data) => assert(data[key].indexOf('0.0.61') > 0))
      )
      .toPromise();
  });
});
