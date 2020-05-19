import { OutputChannel, window } from 'vscode';
import { tap } from 'rxjs/operators';
import { SpawnLine, SPAWN_OUTPUT_TYPE } from './shell';
import { MonoTypeOperatorFunction } from 'rxjs';

/**
 * Logs lines and error messages from a stream
 *
 * @param aChannel - target channel
 *
 * @returns the logger operator
 */
export function createLogger(
  aChannel: OutputChannel
): MonoTypeOperatorFunction<SpawnLine> {
  function logNext(aLine: string) {
    aChannel.appendLine(aLine);
  }

  function logError(aError: string) {
    window.showWarningMessage(aError);
  }

  return tap<SpawnLine>(
    ([type, line]) =>
      type === SPAWN_OUTPUT_TYPE.STDOUT ? logNext(line) : logError(line),
    logError
  );
}
