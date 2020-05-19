import { getHostnameFromSshConfig } from './ssh';
import { tap } from 'rxjs/operators';

describe('ssh config', () => {
  it('should read the SSH config', () => {
    return getHostnameFromSshConfig('zaas').pipe(tap(console.log)).toPromise();
  });
});
