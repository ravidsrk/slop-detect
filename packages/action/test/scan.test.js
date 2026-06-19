import { test, expect, afterEach } from 'vitest';
import { noticeIfPullRequestTarget, PULL_REQUEST_TARGET_NOTICE } from '../scan.mjs';

const realWrite = process.stdout.write.bind(process.stdout);
let captured = '';

afterEach(() => {
  process.stdout.write = realWrite;
  captured = '';
});

function captureStdout() {
  process.stdout.write = (chunk) => {
    captured += String(chunk);
    return true;
  };
}

test('noticeIfPullRequestTarget emits a GitHub notice on pull_request_target', () => {
  captureStdout();
  expect(noticeIfPullRequestTarget('pull_request_target')).toBe(true);
  expect(captured).toBe(`::notice::${PULL_REQUEST_TARGET_NOTICE}\n`);
});

test('noticeIfPullRequestTarget is silent on pull_request', () => {
  captureStdout();
  expect(noticeIfPullRequestTarget('pull_request')).toBe(false);
  expect(captured).toBe('');
});
