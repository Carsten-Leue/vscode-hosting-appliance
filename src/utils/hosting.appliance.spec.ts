import { login, getRepositories } from './hosting.appliance';
import { tap } from 'rxjs/operators';
import { env } from 'process';
import { Observable } from 'rxjs';

describe('appliance REST', () => {
  const { HA_USERNAME, HA_PASSWORD, HA_HOSTNAME } = env;

  const createToken = (aHostName: string) =>
    login(HA_USERNAME!, HA_PASSWORD!, aHostName);

  it('should login', () => {
    return login(HA_USERNAME!, HA_PASSWORD!, HA_HOSTNAME!)
      .pipe(tap((token) => expect(token).toBeDefined()))
      .toPromise();
  });

  it('should get the repos', () => {
    return getRepositories(HA_HOSTNAME!, createToken)
      .pipe(tap(console.log))
      .toPromise();
  });
});
