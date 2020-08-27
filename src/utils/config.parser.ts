import { join } from 'path';
import { Observable, of } from 'rxjs';
import { map, reduce, filter } from 'rxjs/operators';
import { ASSET_ROOT } from './assets';

import { createFileDescriptor, FileDescriptor } from './file';
import { rxPipe, SPAWN_OUTPUT_TYPE } from './shell';

export type ConfigParserType = any;

function readConfigFile(
  aPython: string,
  aData: Buffer
): Observable<ConfigParserType> {
  // name of the python file used to read
  const script = join(ASSET_ROOT, 'python', 'config_to_json.py');
  // pipe
  return of(aData).pipe(
    rxPipe(aPython, [script]),
    filter(([type]) => type === SPAWN_OUTPUT_TYPE.STDOUT),
    map(([, line]) => line),
    reduce((lines: string[], line: string) => [...lines, line], []),
    map((lines) => lines.join('\n')),
    map((data) => JSON.parse(data))
  );
}

function writeConfigFile(
  aPython: string,
  aData: ConfigParserType
): Observable<Buffer> {
  // name of the python file used to write
  const script = join(ASSET_ROOT, 'python', 'json_to_config.py');
  // pipe
  return of(JSON.stringify(aData)).pipe(
    rxPipe(aPython, [script]),
    filter(([type]) => type === SPAWN_OUTPUT_TYPE.STDOUT),
    map(([, line]) => line),
    reduce((lines: string[], line: string) => [...lines, line], []),
    map((lines) => lines.join('\n')),
    map((data) => Buffer.from(data, 'utf-8'))
  );
}

export function parseConfig(
  aPython: string,
  aSrc: FileDescriptor<Buffer>
): Observable<FileDescriptor<ConfigParserType>> {
  // original file
  const [path, data] = aSrc;
  // dispatch
  return readConfigFile(aPython, data).pipe(
    map((parser) => createFileDescriptor(path, parser))
  );
}

export function serializeConfig(
  aPython: string,
  aSrc: FileDescriptor<ConfigParserType>
): Observable<FileDescriptor<Buffer>> {
  // original file
  const [path, parser] = aSrc;
  // dispatch
  return writeConfigFile(aPython, parser).pipe(
    map((data) => createFileDescriptor(path, data))
  );
}
