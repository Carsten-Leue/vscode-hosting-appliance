import * as _byLine from 'byline';
import { ChildProcess, SpawnOptions } from 'child_process';
import { spawn } from 'cross-spawn';
import { Observable, Observer } from 'rxjs';

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
