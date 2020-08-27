import { join } from 'path';
import { ASSET_ROOT } from './assets';
import { expect } from 'chai';
import { createReader } from './file';
import { mergeMap, tap } from 'rxjs/operators';
import { parseConfig, serializeConfig } from './config.parser';

describe('config parser', () => {
  const TEST_ROOT = join(ASSET_ROOT, 'test', 'sample_project');

  const PYTHON = 'py';

  it('should read the config file from buffer', async () => {
    const reader = createReader(TEST_ROOT);

    const config$ = reader('.bumpversion.cfg').pipe(
      mergeMap((data) => parseConfig(PYTHON, data)),
      tap(([path, config]) => expect(config['bumpversion']).not.to.be.undefined)
    );

    return config$.toPromise();
  });

  it('should read any serialize a config', async () => {
    const reader = createReader(TEST_ROOT);

    const config$ = reader('.bumpversion.cfg').pipe(
      mergeMap((data) => parseConfig(PYTHON, data)),
      mergeMap((cfg) => serializeConfig(PYTHON, cfg)),
      mergeMap((data) => parseConfig(PYTHON, data)),
      tap(([path, config]) => expect(config['bumpversion']).not.to.be.undefined)
    );

    return config$.toPromise();
  });
});
