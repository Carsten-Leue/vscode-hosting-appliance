import { join, parse } from 'path';
import { merge, Observable } from 'rxjs';
import { filter, map, mergeMap, reduce, shareReplay } from 'rxjs/operators';

import { ASSET_ROOT } from './assets';
import { parseConfig, serializeConfig } from './config.parser';
import { createFileDescriptor, createReader, FileDescriptor, relativePath } from './file';
import { rxApplyTemplates, rxReadTemplates } from './templates';

const TEMPLATE_ROOT = join(ASSET_ROOT, 'templates', 'package');

function isInitFile(aFileName: string): boolean {
  const { base } = parse(aFileName);
  return base === '__init__.py';
}

function assertSection(aConfig: any, aSection: string): any {
  if (!aConfig.hasSection(aSection)) {
    aConfig.addSection(aSection);
  }
  return aConfig;
}

export function generatePackage(
  aRootDir: string,
  aDstDir: string,
  aPackageName: string
): Observable<FileDescriptor<string | Buffer>> {
  // read callback
  const reader = createReader(aRootDir);
  // config
  const config$ = reader('.bumpversion.cfg').pipe(mergeMap(parseConfig));
  // version
  const version$ = config$.pipe(
    map(([, cfg]) => cfg.get('bumpversion', 'current_version')),
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
  const applied$ = rxApplyTemplates(context$, template$).pipe(
    map(([relPath, data]) =>
      createFileDescriptor(relativePath(aRootDir, join(aDstDir, relPath)), data)
    ),
    shareReplay()
  );
  // names of the generated init files
  const initFiles$ = applied$.pipe(
    map(([path]) => path),
    filter(isInitFile)
  );
  // update the config file
  const newConfig$ = config$.pipe(
    mergeMap(([path, config]) =>
      initFiles$.pipe(
        map((path) => `bumpversion:file:${path}`),
        reduce(assertSection, config),
        map((cfg) => createFileDescriptor(path, cfg))
      )
    ),
    mergeMap(serializeConfig)
  );

  // write the files
  return merge(applied$, newConfig$);
}
