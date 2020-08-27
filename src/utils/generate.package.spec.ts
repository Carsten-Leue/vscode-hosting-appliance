import { expect } from 'chai';
import { join } from 'path';
import { reduce, tap } from 'rxjs/operators';

import { ASSET_ROOT } from './assets';
import { generatePackage } from './generate.package';

describe('generate package', () => {
  const TEST_ROOT = join(ASSET_ROOT, 'test', 'sample_project');

  const PYTHON = 'py';

  it('should generate a package file', () => {
    const ROOT_PACKAGE = 'hpga_test';
    const SUB_PACKAGE = 'api';
    const DST_FOLDER = join(TEST_ROOT, ROOT_PACKAGE);
    const files$ = generatePackage(PYTHON, TEST_ROOT, DST_FOLDER, SUB_PACKAGE);

    const key = `${ROOT_PACKAGE}/${SUB_PACKAGE}/_internal/__init__.py`;

    return files$
      .pipe(
        reduce(
          (dst: Record<string, string | Buffer>, [path, data]) => ({
            ...dst,
            [path]: data,
          }),
          {}
        ),
        tap((data) => expect(data[key].indexOf('0.0.61')).to.be.greaterThan(0)),
        tap((data) =>
          expect(data['.bumpversion.cfg'].toString()).to.contain(
            `[bumpversion:file:${ROOT_PACKAGE}/${SUB_PACKAGE}/_internal/__init__.py]`
          )
        )
      )
      .toPromise();
  });
});
