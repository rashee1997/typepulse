import dns from 'node:dns/promises';

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // invalid IP treated as unsafe
  }

  const [a, b] = parts;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is loopback, unique local, link-local, or IPv4-mapped.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // Unique local (fc00::/7)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true; // Link-local (fe80::/10)
  
  // IPv4-mapped IPv6 (::ffff:192.168.x.x)
  if (normalized.includes('::ffff:')) {
    const ipv4Part = normalized.split('::ffff:')[1];
    if (ipv4Part && ipv4Part.includes('.')) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  return false;
}

const ALLOWED_PATHS = new Set([
  '/v1/chat/completions',
  '/chat/completions',
  '/v1/models',
  '/models',
]);

/**
 * Validates target endpoint and path against SSRF vulnerabilities.
 */
export async function validateProxyTarget(
  endpoint: string,
  path: string = '/chat/completions'
): Promise<{ valid: boolean; error?: string; targetUrl?: string }> {
  if (!endpoint || typeof endpoint !== 'string') {
    return { valid: false, error: 'Endpoint URL is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { valid: false, error: 'Invalid endpoint URL format' };
  }

  // Must use HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only secure HTTPS endpoints are allowed' };
  }

  // Restrict port to standard HTTPS or none
  if (parsed.port && parsed.port !== '443') {
    return { valid: false, error: 'Non-standard ports are prohibited' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Deny localhost and internal hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal'
  ) {
    return { valid: false, error: 'Internal hostnames are prohibited' };
  }

  // Check if hostname is already a raw IP literal
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { valid: false, error: 'Private and loopback IP addresses are prohibited' };
    }
  } else if (hostname.includes(':') || hostname.startsWith('[')) {
    const cleanIp = hostname.replace(/^\[|\]$/g, '');
    if (isPrivateIPv6(cleanIp)) {
      return { valid: false, error: 'Private and loopback IP addresses are prohibited' };
    }
  } else {
    // Resolve DNS to verify it doesn't map to private or metadata IP
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      for (const addr of addresses) {
        if (addr.family === 4 && isPrivateIPv4(addr.address)) {
          return { valid: false, error: 'Endpoint resolves to a private or restricted address' };
        }
        if (addr.family === 6 && isPrivateIPv6(addr.address)) {
          return { valid: false, error: 'Endpoint resolves to a private or restricted address' };
        }
      }
    } catch {
      return { valid: false, error: 'Could not resolve endpoint host' };
    }
  }

  // Normalize path
  const normalizedPath = (path.startsWith('/') ? path : `/${path}`).replace(/\/+$/, '') || '/chat/completions';
  const cleanEndpoint = endpoint.replace(/\/+$/, '');
  const finalPath = cleanEndpoint.endsWith('/v1')
    ? (normalizedPath.startsWith('/v1/') ? normalizedPath.slice(3) : normalizedPath)
    : (normalizedPath.startsWith('/v1/') ? normalizedPath : `/v1${normalizedPath}`);

  // Validate path against allowed endpoints
  const pathToCheck = finalPath.startsWith('/v1') ? finalPath : `/v1${finalPath}`;
  if (!ALLOWED_PATHS.has(finalPath) && !ALLOWED_PATHS.has(pathToCheck)) {
    return { valid: false, error: 'Disallowed API path' };
  }

  const targetUrl = cleanEndpoint.endsWith('/v1')
    ? `${cleanEndpoint}${finalPath.startsWith('/v1') ? finalPath.slice(3) : finalPath}`
    : `${cleanEndpoint}${finalPath}`;

  return { valid: true, targetUrl };
}
