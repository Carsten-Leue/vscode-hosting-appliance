import { mkdir, PathLike, readdir, readFile, stat, Stats, writeFile } from 'fs';
import { join, normalize, parse, relative } from 'path';
import {
  bindNodeCallback,
  EMPTY,
  from,
  merge,
  MonoTypeOperatorFunction,
  Observable,
  of,
  UnaryFunction,
} from 'rxjs';
import { catchError, map, mapTo, mergeMap } from 'rxjs/operators';

const rxStat = bindNodeCallback<PathLike, Stats>(stat);
const rxReaddir = bindNodeCallback<PathLike, string[]>(readdir);
const rxReadBinaryFile = bindNodeCallback<PathLike, Buffer>(readFile);
const rxWriteBinaryFile = bindNodeCallback<PathLike, Buffer>(writeFile);
const rxMakeDir = bindNodeCallback<PathLike>(mkdir);

/**
 * File descriptor, first element is path, second is content
 */
export type FileDescriptor<T> = [string, T];

export function createFileDescriptor<T>(
  aName: string,
  aValue: T
): FileDescriptor<T> {
  return [aName, aValue];
}

export interface ReadDirectoryEntry {
  path: string;
  isDirectory: boolean;
}

/**
 * Function type to read a directory
 */
export type ReadDirectory = (
  aBaseDir: string,
  aAccept?: (entry: ReadDirectoryEntry) => boolean
) => Observable<FileDescriptor<Buffer>>;

function doWalkFiles(
  root: string,
  relPath: string,
  aAccept: UnaryFunction<ReadDirectoryEntry, boolean>
): Observable<ReadDirectoryEntry> {
  // full path
  const absPath = join(root, relPath);
  // make the descriptor
  const desc$ = rxStat(absPath).pipe(
    map((stats) => ({ path: relPath, isDirectory: stats.isDirectory() }))
  );
  // get the children
  const children$ = rxReaddir(absPath).pipe(
    // isolate individual files
    mergeMap((children) => from(children)),
    // recurse
    mergeMap((child) => doWalkFiles(root, join(relPath, child), aAccept))
  );
  // check if accepted
  return desc$.pipe(
    mergeMap((desc) =>
      aAccept(desc)
        ? desc.isDirectory
          ? merge(of(desc), children$)
          : of(desc)
        : EMPTY
    )
  );
}

const ACCEPT_ALWAYS = () => true;

function rxWalkFiles(
  aRoot: string,
  aAccept: UnaryFunction<ReadDirectoryEntry, boolean> = ACCEPT_ALWAYS
): Observable<ReadDirectoryEntry> {
  // start the recursion, now
  return doWalkFiles(aRoot, '', aAccept);
}

/**
 * Reads a binary file if it is not a directory
 *
 * @param aDesc  - the file descriptor
 * @returns the descriptor of the file
 */
function rxReadBinFile(
  aRootPath: string,
  aDesc: ReadDirectoryEntry
): Observable<FileDescriptor<Buffer>> {
  // extract some info
  const { path, isDirectory } = aDesc;
  // only read files
  if (isDirectory) {
    return EMPTY;
  }
  // read the file
  return rxReadBinaryFile(join(aRootPath, path)).pipe(
    map((data) => createFileDescriptor(path, data))
  );
}

/**
 * Reads all files in the directory and all of its (accepted) subdirectories
 *
 * @param aBaseDir - root directory
 * @param aAccept - function to test if the file is accepted
 *
 * @returns a sequence of files in no particular order
 */
export function rxReadDir(
  aBaseDir: string,
  aAccept?: UnaryFunction<ReadDirectoryEntry, boolean>
): Observable<FileDescriptor<Buffer>> {
  // stat the root
  const isDir$ = rxStat(aBaseDir).pipe(
    map((stats) => stats.isDirectory()),
    catchError(() => of(false))
  );
  // read the directory and for each file the file content
  return isDir$.pipe(
    mergeMap((isDir) => (isDir ? rxWalkFiles(aBaseDir, aAccept) : EMPTY)),
    mergeMap((entry) => rxReadBinFile(aBaseDir, entry))
  );
}

function serializeJson(aData: any): string {
  return JSON.stringify(aData, undefined, 2);
}

/**
 * Converts an arbitrary value into a buffer
 *
 * @param aValue - the value
 * @returns the buffer
 */
const anyToBuffer = (aValue: any): Buffer =>
  typeof aValue === 'string'
    ? Buffer.from(aValue)
    : Buffer.isBuffer(aValue)
    ? aValue
    : Buffer.from(serializeJson(aValue));

// write the file
function doWriteFile<T>(
  aAbsName: string,
  aDst: FileDescriptor<T>,
  aOverride: boolean
): Observable<FileDescriptor<T>> {
  // decompose
  const [, data] = aDst;
  // get the original buffer
  const buf = anyToBuffer(data);
  // read the content
  const isSame$ = rxReadBinaryFile(aAbsName).pipe(
    map((read) => read && (!aOverride || read.equals(buf))),
    catchError(() => of(false))
  );
  // write
  const written$ = rxWriteBinaryFile(aAbsName, buf).pipe(mapTo(aDst));
  // only write if different
  return isSame$.pipe(mergeMap((same) => (!same ? written$ : EMPTY)));
}

/**
 * Write file and make sure to attach to a pending write operation
 *
 * @param aRoot - the target root
 * @param aDesc - file descriptor to write
 * @param aOverride - override flag
 *
 * @returns the final observable
 */
function ensureWriteFile<T>(
  aRoot: string,
  aDesc: FileDescriptor<T>,
  aMkdirs: UnaryFunction<string, PromiseLike<string>>,
  aOverride: boolean
): Observable<FileDescriptor<T>> {
  // decompose
  const [name] = aDesc;
  // build the full path
  const absPath = normalize(join(aRoot, name));
  const { dir } = parse(absPath);
  // do write
  return from(aMkdirs(dir)).pipe(
    mergeMap(() => doWriteFile(absPath, aDesc, aOverride))
  );
}

function rxMkDir(aDir: string): PromiseLike<string> {
  return rxMakeDir(aDir)
    .pipe(
      mapTo(aDir),
      catchError(() => of(aDir))
    )
    .toPromise();
}

function rxMkDirs(): UnaryFunction<string, PromiseLike<string>> {
  // directory map
  const dirMap: { [path: string]: PromiseLike<string> } = {};

  function _mkdir(aDir: string): PromiseLike<string> {
    // test if we know the directory
    return dirMap[aDir] || (dirMap[aDir] = rxMkDir(aDir));
  }

  function _mkdirp(aDir: string): PromiseLike<string> {
    // check if we know the directory
    let res = dirMap[aDir];
    if (!res) {
      // construct the parent directory
      const parsed = parse(aDir);
      // test for the root directory
      if (parsed.root === parsed.dir) {
        // do not recurse
        res = Promise.resolve(aDir);
      } else {
        // construct the parent and attach
        res = _mkdirp(parsed.dir).then(() => _mkdir(aDir));
      }
    }
    // ok
    return res;
  }

  return _mkdirp;
}

/**
 * Returns an operator that writes all file descriptors to disk
 *
 * @param aRoot - the base of the target file system
 * @param aOverride - override flag
 *
 * @returns the operator
 */
export function writeFiles<T>(
  aRoot: string,
  aOverride: boolean = true
): MonoTypeOperatorFunction<FileDescriptor<T>> {
  // generate directories
  const mkdirs = rxMkDirs();

  // write file handler
  const write = (aDesc: FileDescriptor<T>) =>
    ensureWriteFile(aRoot, aDesc, mkdirs, aOverride);

  return mergeMap(write);
}

export function relativePath(aSrc: string, aDst: string): string {
  return relative(aSrc, aDst).replace(/\\/g, '/');
}

export function createReader(
  aBaseDir: string
): UnaryFunction<string, Observable<FileDescriptor<Buffer>>> {
  return (path: string) =>
    rxReadBinFile(aBaseDir, { path, isDirectory: false });
}
