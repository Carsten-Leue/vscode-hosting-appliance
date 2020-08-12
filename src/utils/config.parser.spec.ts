import { join } from 'path';
import { ASSET_ROOT } from './assets';
import { expect } from 'chai';
import { createReader } from './file';
import { mergeMap, tap } from 'rxjs/operators';
import { parseConfig, serializeConfig } from './config.parser';
import { config } from 'process';
const ConfigParser = require('configparser');

describe('config parser', () => {
  const TEST_ROOT = join(ASSET_ROOT, 'test', 'sample_project');

  it('should read the config file', async () => {
    const config = new ConfigParser();
    await config.readAsync(join(TEST_ROOT, '.bumpversion.cfg'));

    expect(config.hasSection('bumpversion')).to.be.true;
  });

  it('should read the config file from buffer', async () => {
    const reader = createReader(TEST_ROOT);

    const config$ = reader('.bumpversion.cfg').pipe(
      mergeMap(parseConfig),
      tap(
        ([path, config]) => expect(config.hasSection('bumpversion')).to.be.true
      )
    );

    return config$.toPromise();
  });

  it('should read any serialize a config', async () => {
    const reader = createReader(TEST_ROOT);

    const config$ = reader('.bumpversion.cfg').pipe(
      mergeMap(parseConfig),
      mergeMap(serializeConfig),
      mergeMap(parseConfig),
      tap(
        ([path, config]) => expect(config.hasSection('bumpversion')).to.be.true
      )
    );

    return config$.toPromise();
  });
});
