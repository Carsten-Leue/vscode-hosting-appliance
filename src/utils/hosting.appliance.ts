import { Observable, UnaryFunction } from 'rxjs';
import { ajax, AjaxRequest } from 'rxjs/ajax';
import { pluck, switchMap } from 'rxjs/operators';
import { Agent } from 'https';

const KEY_ACCEPT = 'Accept';
const KEY_API = 'zACI-API';
const KEY_CONTENT_TYPE = 'Content-Type';
const KEY_CONTENT_LENGTH = 'Content-Length';
const KEY_CACHE_CONTROL = 'Cache-Control';
const KEY_AUTHORIZATION = 'Authorization';

const VALUE_ACCEPT = 'application/vnd.ibm.zaci.payload+json';
const VALUE_API = 'com.ibm.zaci.system/1.0';
const VALUE_PAYLOAD = 'application/vnd.ibm.zaci.payload+json;version=1.0';
const VALUE_CACHE_CONTROL = 'no-cache';

const HTTPS_AGENT = new Agent({ rejectUnauthorized: false });

function getBearer(aToken: string): string {
  return `Bearer ${aToken}`;
}

function createXHR(): XMLHttpRequest {
  const XMLHttpRequestPort = require('xhr2');
  const xhr = new XMLHttpRequestPort();
  xhr.nodejsSet({ httpsAgent: HTTPS_AGENT });
  return xhr;
}

const DEFAULT_HEADERS: Record<string, string> = {
  [KEY_ACCEPT]: VALUE_ACCEPT,
  [KEY_API]: VALUE_API,
  [KEY_CACHE_CONTROL]: VALUE_CACHE_CONTROL,
};

const CONTENT_HEADERS: Record<string, string> = {
  ...DEFAULT_HEADERS,
  [KEY_CONTENT_TYPE]: VALUE_PAYLOAD,
};

const DEFAULT_REQUEST: Partial<AjaxRequest> = {
  createXHR,
  async: true,
  responseType: 'json',
};

export function login(
  aUsername: string,
  aPassword: string,
  aHostname: string
): Observable<string> {
  // assemble the request infos
  const url = `https://${aHostname}/api/com.ibm.zaci.system/api-tokens`;
  const body = JSON.stringify({
    kind: 'request',
    parameters: {
      user: aUsername,
      password: aPassword,
    },
  });
  // send the request
  return ajax({
    ...DEFAULT_REQUEST,
    headers: CONTENT_HEADERS,
    url,
    body,
    method: 'POST',
  }).pipe(pluck('response', 'parameters', 'token'));
}

export interface RepositoryDefShort {
  repository_name: string;
  runtime: string;
}

export type RepositoriesDefShort = Record<string, RepositoryDefShort>;

export function getRepositories(
  aHostname: string,
  aAuthenticator: UnaryFunction<string, Observable<string>>
): Observable<RepositoriesDefShort> {
  // assemble the request infos
  const url = `https://${aHostname}/api/com.ibm.zaas/repositories`;
  // get the repos
  return aAuthenticator(aHostname).pipe(
    switchMap((token) =>
      ajax({
        ...DEFAULT_REQUEST,
        headers: { ...DEFAULT_HEADERS, [KEY_AUTHORIZATION]: getBearer(token) },
        url,
      })
    ),
    pluck('response')
  );
}
