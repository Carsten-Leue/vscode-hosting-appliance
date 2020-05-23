import { OutputChannel, window } from 'vscode';
import { tap } from 'rxjs/operators';
import { SpawnLine, SPAWN_OUTPUT_TYPE } from './shell';
import { MonoTypeOperatorFunction } from 'rxjs';

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
    aChannel.appendLine(`[${new Date().toISOString}] ${aLine}`);
  const logError = (aError: string) => window.showWarningMessage(aError);

  return tap<SpawnLine>(
    ([type, line]) =>
      type === SPAWN_OUTPUT_TYPE.STDOUT ? logNext(line) : logError(line),
    logError
  );
}
