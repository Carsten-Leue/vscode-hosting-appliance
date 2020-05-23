import { OutputChannel } from 'vscode';

/**
 * Some simplistic time logger
 *
 * @param aChannel - the channel
 * @param aKey - some debug key
 * @param aWorkload$ - the workload to attach to
 */
export function timing<T>(
  aChannel: OutputChannel,
  aKey: string,
  aWorkload$: Thenable<T>
) {
  // start time
  const t0 = Date.now();
  // handle
  return aWorkload$
    .then(
      () => aChannel.appendLine(`${aKey} succeeded in ${Date.now() - t0}ms.`),
      () => aChannel.appendLine(`${aKey} failed after ${Date.now() - t0}ms.`)
    )
    .then(() => aWorkload$);
}
