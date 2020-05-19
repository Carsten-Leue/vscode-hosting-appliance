import { ignoreElements } from 'rxjs/operators';
import { OutputChannel, window } from 'vscode';

import { createLogger } from './logger';
import { rxSpawn } from './shell';

export function restartServices(
  aLpar: string,
  aChannel: OutputChannel
): Thenable<void> {
  // restart
  const log = 'Restarting services ...';
  aChannel.appendLine(log);
  // command
  const cmd =
    'systemctl daemon-reload && service uwsgi restart && systemctl restart docker-authz-plugin.service && service nginx restart';
  // use ssh to restart
  const restart$ = rxSpawn('ssh', [aLpar, cmd])
    .pipe(createLogger(aChannel), ignoreElements())
    .toPromise();
  // set status bar text
  window.setStatusBarMessage(log, restart$);
  // done
  return restart$;
}
