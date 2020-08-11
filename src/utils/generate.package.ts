import { PathLike, readFile } from 'fs';
import { join } from 'path';
import { bindNodeCallback, Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';

import { ASSET_ROOT } from './assets';
import { FileDescriptor } from './file';
import { rxApplyTemplates, rxReadTemplates } from './templates';

const rxReadBinaryFile = bindNodeCallback<PathLike, Buffer>(readFile);

const TEMPLATE_ROOT = join(ASSET_ROOT, 'templates', 'package');

export function generatePackage(
  aRootDir: string,
  aPackageName: string
): Observable<FileDescriptor<string>> {
  // name of the config file
  const configName = join(aRootDir, '.bumpversion.cfg');
  // config
  const config$ = rxReadBinaryFile(configName).pipe(
    map((data) => data.toString()),
    shareReplay()
  );
  // version
  const version$ = config$.pipe(
    map((cfg) => /current_version\s+=\s+(\d+\.\d+\.\d+)/gm.exec(cfg)),
    map((data) => (data && data.length > 1 ? data[1] : '0.0.0')),
    shareReplay()
  );
  // prepare the data record
  const year = new Date().getFullYear();
  const context$ = version$.pipe(
    map((version) => ({ version, package_name: aPackageName, year }))
  );
  // iterate over the templates
  const template$ = rxReadTemplates(TEMPLATE_ROOT);
  // apply the templates
  const applied$ = rxApplyTemplates(context$, template$);

  // write the files
  return applied$;
}
