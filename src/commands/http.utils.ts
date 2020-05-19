import { Observable, UnaryFunction, defer, combineLatest } from 'rxjs';
import { getUsername, getPassword } from '../utils/settings';
import { switchMap } from 'rxjs/operators';
import { login } from '../utils/hosting.appliance';
import { OutputChannel, ExtensionContext } from 'vscode';

export function createAuthenticator(
  channel: OutputChannel,
  context: ExtensionContext
): UnaryFunction<string, Observable<string>> {
  // get username and pwd
  const username$ = defer(() => getUsername());
  const password$ = defer(() => getPassword());
  // credentials
  const credentials$ = combineLatest([username$, password$]);
  // returns the authenticator
  return (aHostname: string): Observable<string> => {
    // login
    return credentials$.pipe(
      switchMap(([username, password]) => login(username, password, aHostname))
    );
  };
}
