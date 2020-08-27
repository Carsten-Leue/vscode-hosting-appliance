import * as _byLine from 'byline';
import { ChildProcess, SpawnOptions } from 'child_process';
import { spawn } from 'cross-spawn';
import {
  Observable,
  Observer,
  OperatorFunction,
  Unsubscribable,
  using,
  merge,
} from 'rxjs';
import { map, finalize, ignoreElements } from 'rxjs/operators';

export enum SPAWN_OUTPUT_TYPE {
  STDOUT,
  STDERR,
}

export type SpawnLine = [SPAWN_OUTPUT_TYPE, string];

const noColors = /\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]/g;

/**
 * Removes all color coding from the line and returns it
 *
 * @param aLine  - the actual line
 * @returns the line without color coding
 */
function getRawLine(aLine: any): string {
  return aLine.toString().replace(noColors, '');
}

/**
 * Spawns a process with arguments and produces
 *
 * @param aCmd - the command to execute
 * @param aArgs - arguments to the command
 * @param aOpts - command options
 *
 * @returns an observable with the line based output of the command
 */
export function rxSpawn(
  aCmd: string,
  aArgs: string[],
  aOpts?: SpawnOptions
): Observable<SpawnLine> {
  // create the observable
  return Observable.create((aObserver: Observer<SpawnLine>) => {
    // shortcuts
    const onError = aObserver.error.bind(aObserver);
    // stdout options
    const opts: SpawnOptions = Object.assign(
      { env: process.env, cwd: process.cwd() },
      aOpts
    );
    // handles
    opts.stdio = ['inherit', 'pipe', 'pipe'];
    // execute
    const proc: ChildProcess = spawn(aCmd, aArgs, opts);
    // stdout
    const byLine = _byLine;
    const stdout = byLine(proc.stdout!);
    // pipe stdout to the target
    stdout.on('data', (line) =>
      aObserver.next([SPAWN_OUTPUT_TYPE.STDOUT, getRawLine(line)])
    );
    // stderr
    const stderr = byLine(proc.stderr!);
    const buffer: string[] = [];
    stderr.on('data', (line) => {
      // the line
      const rawLine = getRawLine(line);
      // dispatch
      aObserver.next([SPAWN_OUTPUT_TYPE.STDERR, rawLine]);
      // assemble for error handling
      buffer.push(rawLine);
    });
    // error handling
    stdout.once('error', onError);
    stderr.once('error', onError);
    proc.once('error', onError);
    // exit handler
    const onExit = (errno: number) => {
      // check
      if (errno === 0) {
        aObserver.complete();
      } else {
        onError(new Error(aCmd));
      }
    };
    // exit state
    proc.once('close', onExit);
    proc.once('exit', onExit);
    // handle killing the process
    return () => proc.kill();
  });
}

class ProcessResource implements Unsubscribable {
  constructor(public proc: ChildProcess) {}

  unsubscribe() {
    this.proc.kill();
  }
}

/**
 * Spawns a process with arguments and produces
 *
 * @param aCmd - the command to execute
 * @param aArgs - arguments to the command
 * @param aOpts - command options
 *
 * @returns an observable with the line based output of the command
 */
export function rxPipe(
  aCmd: string,
  aArgs: string[],
  aOpts?: SpawnOptions
): OperatorFunction<Buffer | string, SpawnLine> {
  // process factory
  const procFct = () => {
    // stdout options
    const opts: SpawnOptions = Object.assign(
      { env: process.env, cwd: process.cwd() },
      aOpts,
      { stdio: 'pipe' }
    );
    // execute
    const proc: ChildProcess = spawn(aCmd, aArgs, opts);
    return new ProcessResource(proc);
  };
  // factory for the output
  const startProcess = (proc: ChildProcess): Observable<SpawnLine> =>
    Observable.create((aObserver: Observer<SpawnLine>) => {
      // stdout
      const byLine = _byLine;
      const stdout = byLine(proc.stdout!);
      const stderr = byLine(proc.stderr!);
      const buffer: string[] = [];
      // shortcuts
      const onError = aObserver.error.bind(aObserver);
      // pipe stdout to the target
      stdout.on('data', (line) =>
        aObserver.next([SPAWN_OUTPUT_TYPE.STDOUT, getRawLine(line)])
      );
      // stderr
      stderr.on('data', (line) => {
        // the line
        const rawLine = getRawLine(line);
        // dispatch
        aObserver.next([SPAWN_OUTPUT_TYPE.STDERR, rawLine]);
        // assemble for error handling
        buffer.push(rawLine);
      });
      // error handling
      stdout.once('error', onError);
      stderr.once('error', onError);
      proc.once('error', onError);
      // exit handler
      const onExit = (errno: number) => {
        // check
        if (errno === 0) {
          aObserver.complete();
        } else {
          onError(new Error(aCmd));
        }
      };
      // exit state
      proc.once('close', onExit);
      proc.once('exit', onExit);
    });

  // dispatch
  return (src$: Observable<Buffer | string>) => {
    // observable factory
    const obFct = (res: any): Observable<SpawnLine> => {
      // execute
      const proc: ChildProcess = res.proc;
      const stdin = proc.stdin!;
      // output
      const out$ = startProcess(proc);
      // input
      const in$ = src$.pipe(
        map((chunk) => stdin.write(chunk)),
        ignoreElements(),
        finalize(() => stdin.end())
      );
      // combine in and out
      return merge(in$, out$);
    };
    // coordinate process creation and stream
    return using(procFct, obFct);
  };
}
