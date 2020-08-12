import { PathLike, readFile, unlink, writeFile } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { bindNodeCallback, defer, from, Observable, of } from 'rxjs';
import { map, mapTo, mergeMap } from 'rxjs/operators';

import { createFileDescriptor, FileDescriptor } from './file';

const rxUnlink = bindNodeCallback(unlink);
const rxWriteFile = bindNodeCallback<PathLike, Buffer>(writeFile);
const rxReadFile = bindNodeCallback<PathLike, Buffer>(readFile);

export type ConfigParserType = any;

export function parseConfig(
  src: FileDescriptor<Buffer>
): Observable<FileDescriptor<ConfigParserType>> {
  // original file
  const [path, data] = src;
  // load the config parser
  const ConfigParser = require('configparser');
  return defer(() => of(new ConfigParser())).pipe(
    mergeMap((parser) => {
      // poorman's tempfile
      const name = join(tmpdir(), Math.random().toString());
      // write the file
      return rxWriteFile(name, data).pipe(
        mergeMap(() => parser.readAsync(name)),
        mergeMap(() => rxUnlink(name)),
        mapTo(parser)
      );
    }),
    map((parser) => createFileDescriptor(path, parser))
  );
}

export function serializeConfig(
  src: FileDescriptor<ConfigParserType>
): Observable<FileDescriptor<Buffer>> {
  // original file
  const [path, parser] = src;
  // load the config parser
  return defer(() => of(parser)).pipe(
    mergeMap((parser) => {
      // poorman's tempfile
      const name = join(tmpdir(), Math.random().toString());
      // write the file
      return from(parser.writeAsync(name)).pipe(
        mergeMap(() => rxReadFile(name)),
        mergeMap((data) => rxUnlink(name).pipe(mapTo(data)))
      );
    }),
    map((data) => createFileDescriptor(path, data))
  );
}
