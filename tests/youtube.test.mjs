import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parseYouTubeStatus, parseYouTubeAuthorization, parseYouTubeCallback, youtubeConnectBody, youtubeCompleteBody, youtubeDisconnectBody } from '../lib/youtube.ts';
import { readPreviewMutationJson } from '../lib/previewResubmitRequest.ts';
import { parseYouTubeVideoPage, youtubeVideoQuery, youtubeVideoRetryBody } from '../lib/youtubeVideos.ts';

const state = 'a'.repeat(64);
const status = { configured: true, configurationIssue: null, connected: true, needsReconnect: false, revision: 1, channel: { id: 'UC' + 'a'.repeat(22), title: 'Example channel', url: 'https://malicious.example' }, connectedAt: '2026-09-28T12:00:00Z', privacyStatus: 'public', accessToken: 'never-browser' };
test('status projects only safe fields and a canonical channel URL', () => {
  const result = parseYouTubeStatus(status);
  assert.equal(result.channel.url, `https://www.youtube.com/channel/${status.channel.id}`);
  assert.equal('accessToken' in result, false);
  assert.equal(parseYouTubeStatus({ ...status, channel: { ...status.channel, title: 'x'.repeat(300) } }).channel.title.length, 300);
  assert.equal(parseYouTubeStatus({ ...status, connected: false, channel: null, revision: 0, connectedAt: null }).channel, null);
  for (const bad of [{ revision: -1 }, { connected: 'true' }, { connected: false }, { channel: { id: 'evil', title: 'X' } }, { privacyStatus: 'private' }, { connectedAt: 'never' }]) assert.throws(() => parseYouTubeStatus({ ...status, ...bad }));
});
test('mutations have strict keys, consent and revision checks', () => {
  assert.deepEqual(youtubeConnectBody({ publicationConsent: true }), { publicationConsent: true });
  assert.deepEqual(youtubeCompleteBody({ code: 'google-code', state }), { code: 'google-code', state });
  assert.deepEqual(youtubeDisconnectBody({ revision: 2 }), { revision: 2 });
  for (const bad of [{}, { publicationConsent: false }, { publicationConsent: true, channel: 'injected' }]) assert.throws(() => youtubeConnectBody(bad));
  for (const bad of [{ code: 'x', state: 'short' }, { code: 'x\nsecret', state }, { code: 'x', state, accessToken: 'x' }, { code: 'x'.repeat(4097), state }]) assert.throws(() => youtubeCompleteBody(bad));
  for (const bad of [{ revision: 0 }, { revision: '1' }, { revision: 1, channel: 'x' }]) assert.throws(() => youtubeDisconnectBody(bad));
});
test('callbacks do not reflect provider errors and reject repeated parameters', () => {
  assert.deepEqual(parseYouTubeCallback(`?code=abc&state=${state}&scope=ignored`), { code: 'abc', state });
  for (const query of [`?code=a&code=b&state=${state}`, `?code=a&state=${state}&state=${state}`, '?error=secret-provider-detail', '?code=a']) assert.throws(() => parseYouTubeCallback(query), error => !error.message.includes('secret-provider-detail'));
});
test('authorization navigation only accepts Google and the exact current callback origin', () => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('state', state); url.searchParams.set('response_type', 'code'); url.searchParams.set('redirect_uri', 'https://admin.example/youtube/callback');
  const value = { authorizationUrl: url.href, expiresAt: '2026-09-28T12:10:00Z' };
  assert.equal(parseYouTubeAuthorization(value, 'https://admin.example').authorizationUrl, url.href);
  for (const bad of [url.href.replace('accounts.google.com', 'evil.example'), url.href.replace('/v2/auth', '/wrong')]) assert.throws(() => parseYouTubeAuthorization({ ...value, authorizationUrl: bad }));
  assert.throws(() => parseYouTubeAuthorization(value, 'https://different.example'));
  url.searchParams.set('state', 'short'); assert.throws(() => parseYouTubeAuthorization({ ...value, authorizationUrl: url.href }));
});
test('cookie mutations require same-origin JSON and a streaming size bound', async () => {
  const request = (body, headers = {}) => new Request('https://admin.example/api/admin/youtube/connect', { method: 'POST', headers: { Origin: 'https://admin.example', 'content-type': 'application/json', ...headers }, body });
  assert.deepEqual(await readPreviewMutationJson(request('{"publicationConsent":true}'), 1024), { publicationConsent: true });
  await assert.rejects(readPreviewMutationJson(request('{}', { Origin: 'https://evil.example' }), 1024), { status: 403 });
  await assert.rejects(readPreviewMutationJson(request('{}', { 'content-type': 'text/plain' }), 1024), { status: 415 });
  await assert.rejects(readPreviewMutationJson(request(JSON.stringify({ data: 'x'.repeat(2048) })), 1024), { status: 413 });
});
test('route and UI boundaries preserve roles, single attempts and credential stripping', () => {
  const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(source('../lib/requireOperationalAdminPage.ts'), /\["admin", "superadmin"\]/);
  assert.match(source('../lib/youtubeProxy.ts'), /replayAfterRefresh: action === "status"/);
  assert.match(source('../lib/adminProxy.ts'), /init\.replayAfterRefresh === false/);
  assert.match(source('../app/youtube/page.tsx'), /requireOperationalAdminPage/);
  assert.match(source('../app/youtube/callback/page.tsx'), /requireOperationalAdminPage/);
  const callback = source('../app/components/youtube/YouTubeCallback.tsx');
  assert.match(callback, /history\.replaceState/); assert.match(callback, /credentials\.current = null/);
  assert.doesNotMatch(callback, /localStorage|sessionStorage|console\./);
  assert.match(source('../app/components/common/AdminNavbarV2.tsx'), /href: "\/youtube"/);
  assert.match(source('../middleware.ts'), /renderUrl\.search = ""/);
});
test('video inventory is bounded, scoped and public links require a confirmed public status', () => {
  const video = { id: 'a'.repeat(64), reportId: 'b'.repeat(24), reportType: 'asset', lotNumber: '12A', status: 'public', url: 'https://www.youtube.com/watch?v=abcDEF123_-', lastError: null, updatedAt: '2026-09-28T12:00:00.000Z', retryEligible: false, sourceUrl: 'private-original' };
  const page = { items: [video], page: 1, total: 1, totalPages: 1 };
  assert.equal('sourceUrl' in parseYouTubeVideoPage(page).items[0], false);
  for (const patch of [{ status: 'private' }, { url: 'https://evil.example' }, { id: 'a'.repeat(24) }, { reportType: 'salvage' }, { updatedAt: 'bad' }]) assert.throws(() => parseYouTubeVideoPage({ ...page, items: [{ ...video, ...patch }] }));
  assert.throws(() => parseYouTubeVideoPage({ ...page, items: Array(21).fill(video) }));
  assert.equal(youtubeVideoQuery(new URLSearchParams('page=2')), 'page=2');
  for (const query of ['page=0', 'page=1&page=2', 'limit=100', 'reportId=abc']) assert.throws(() => youtubeVideoQuery(new URLSearchParams(query)));
  assert.deepEqual(youtubeVideoRetryBody({ updatedAt: video.updatedAt }), { updatedAt: video.updatedAt });
  assert.throws(() => youtubeVideoRetryBody({ updatedAt: video.updatedAt, privacyStatus: 'public' }));
});
