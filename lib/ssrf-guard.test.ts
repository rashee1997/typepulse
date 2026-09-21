import { describe, it, expect } from 'vitest';
import { isPrivateIPv4, isPrivateIPv6, validateProxyTarget } from './ssrf-guard';

describe('SSRF Guard', () => {
  it('identifies private, loopback, and metadata IPv4 addresses', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true);
    expect(isPrivateIPv4('10.0.0.1')).toBe(true);
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('172.31.255.255')).toBe(true);
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
    expect(isPrivateIPv4('169.254.169.254')).toBe(true);
    expect(isPrivateIPv4('0.0.0.0')).toBe(true);
    expect(isPrivateIPv4('8.8.8.8')).toBe(false);
    expect(isPrivateIPv4('1.1.1.1')).toBe(false);
  });

  it('identifies private and loopback IPv6 addresses', () => {
    expect(isPrivateIPv6('::1')).toBe(true);
    expect(isPrivateIPv6('fc00::1')).toBe(true);
    expect(isPrivateIPv6('fe80::1')).toBe(true);
    expect(isPrivateIPv6('2607:f8b0:4005:805::200e')).toBe(false);
  });

  it('rejects unencrypted HTTP endpoints', async () => {
    const res = await validateProxyTarget('http://api.openai.com');
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/HTTPS/i);
  });

  it('rejects loopback and localhost hostnames', async () => {
    const res = await validateProxyTarget('https://localhost:8080');
    expect(res.valid).toBe(false);
  });

  it('rejects non-standard ports', async () => {
    const res = await validateProxyTarget('https://api.openai.com:8443');
    expect(res.valid).toBe(false);
  });

  it('rejects disallowed API paths', async () => {
    const res = await validateProxyTarget('https://api.openai.com', '/admin/secret');
    expect(res.valid).toBe(false);
  });

  it('accepts valid HTTPS OpenAI/compatible endpoints', async () => {
    const res = await validateProxyTarget('https://api.openai.com', '/v1/chat/completions');
    expect(res.valid).toBe(true);
    expect(res.targetUrl).toBe('https://api.openai.com/v1/chat/completions');
  });
});
