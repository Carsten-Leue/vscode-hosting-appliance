import { MonoTypeOperatorFunction } from 'rxjs';
import { tap } from 'rxjs/operators';
import { OutputChannel, Progress, window } from 'vscode';
import { SpawnLine, SPAWN_OUTPUT_TYPE } from './shell';

/**
 * Logs lines and error messages from a stream
 *
 * @param aChannel - target channel
 * @param aIncludeTimestamp - include a timestamp, defaults to false
 *
 * @returns the logger operator
 */
export function createLogger(
  aChannel: OutputChannel,
  aIncludeTimestamp: boolean = false
): MonoTypeOperatorFunction<SpawnLine> {
  // the logger functions
  const logNext = (aLine: string) => aChannel.appendLine(aLine);
  const logNextWithTimestamp = (aLine: string) =>
    aChannel.appendLine(`[${new Date().toISOString()}] ${aLine}`);
  const logError = (aError: string) => window.showWarningMessage(aError);

  const logStdout = aIncludeTimestamp ? logNextWithTimestamp : logNext;

  return tap<SpawnLine>(
    ([type, line]) =>
      type === SPAWN_OUTPUT_TYPE.STDOUT ? logStdout(line) : logError(line),
    logError
  );
}

/**
 * Logs lines and error messages from a stream
 *
 * @param aChannel - target channel
 * @param aIncludeTimestamp - include a timestamp, defaults to false
 *
 * @returns the logger operator
 */
export function createProgress(
  aProgress: Progress<{ message?: string; increment?: number }>,
  aIncludeTimestamp: boolean = false,
  aShowErrors: boolean = true
): MonoTypeOperatorFunction<SpawnLine> {
  // the logger functions
  const logNext = (message: string) => aProgress.report({ message });
  const logNextWithTimestamp = (aLine: string) =>
    aProgress.report({ message: `[${new Date().toISOString()}] ${aLine}` });
  const logError = (aError: string) => window.showWarningMessage(aError);
  const logNone = (aError: string) => {};

  const logStdout = aIncludeTimestamp ? logNextWithTimestamp : logNext;
  const logStdErr = aShowErrors ? logError : logNone;

  return tap<SpawnLine>(
    ([type, line]) =>
      type === SPAWN_OUTPUT_TYPE.STDOUT ? logStdout(line) : logStdErr(line),
    logError
  );
}
