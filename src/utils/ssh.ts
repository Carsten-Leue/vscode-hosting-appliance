import { PathLike, readFile } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { bindNodeCallback, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const rxReadFile = bindNodeCallback<PathLike, string, string>(readFile);

function decodeConfig(aData: string): any {
  const { parse } = require('ssh-config');
  return parse(aData);
}

function getHostname(aLpar: string, aConfig: any): string | undefined {
  const section = aConfig.find({ Host: aLpar });
  if (section) {
    for (const line of section.config) {
      if (line.param === 'HostName') {
        return line.value;
      }
    }
  }
}

/**
 * Reads the hostname from the SSH config
 *
 * @param aLpar - the lpar identifier
 * @returns the decoded hostname
 */
export function getHostnameFromSshConfig(aLpar: string): Observable<string> {
  // name of ssh config
  const sshConfigName = join(homedir(), '.ssh', 'config');
  // read the file
  return rxReadFile(sshConfigName, 'utf-8').pipe(
    map(decodeConfig),
    map((config) => getHostname(aLpar, config)),
    map((result) => result || aLpar)
  );
}
