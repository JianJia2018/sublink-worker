import { describe, it, expect } from 'vitest';
import { parseSubscriptionContent } from '../src/parsers/subscription/subscriptionContentParser.js';

/**
 * Tests for the decodeContent() fix in httpSubscriptionFetcher.js.
 *
 * Root cause: decodeContent() blindly Base64-decoded all input.
 * The custom decodeBase64() in utils.js silently produces garbage for non-Base64 text
 * (it skips invalid chars instead of throwing). This corrupted raw Clash YAML from
 * providers like GLaDOS, resulting in 0 parsed nodes.
 *
 * Fix: detect raw config formats (YAML, Surge INI, JSON) before attempting decode.
 * Since decodeContent is module-private, we test through parseSubscriptionContent.
 */

const gladosStyleYaml = `proxies:
  - name: "\u{1F1E8}\u{1F1F3}中国01"
    type: ss
    server: cn1.example.com
    port: 443
    cipher: chacha20-ietf-poly1305
    password: "password123"
    udp: true
    plugin: obfs
    plugin-opts:
      mode: http
      host: www.bing.com

  - name: "\u{1F1FA}\u{1F1F8}美国01"
    type: ss
    server: us1.example.com
    port: 443
    cipher: chacha20-ietf-poly1305
    password: "password456"
    udp: true
    plugin: obfs
    plugin-opts:
      mode: tls
      host: www.bing.com

  - name: "\u{1F1EF}\u{1F1F5}日本01"
    type: ss
    server: jp1.example.com
    port: 443
    cipher: chacha20-ietf-poly1305
    password: "password789"
    udp: true
    plugin: obfs
    plugin-opts:
      mode: http
      host: www.bing.com

proxy-groups:
  - name: "\u{1F680}节点选择"
    type: select
    proxies:
      - "\u{1F1E8}\u{1F1F3}中国01"
      - "\u{1F1FA}\u{1F1F8}美国01"
      - "\u{1F1EF}\u{1F1F5}日本01"

rules:
  - MATCH,\u{1F680}节点选择
`;

describe('Raw Clash YAML subscription parsing', () => {
    it('should parse raw Clash YAML without Base64 encoding', () => {
        const result = parseSubscriptionContent(gladosStyleYaml);

        expect(result).toBeDefined();
        expect(result.type).toBe('yamlConfig');
        expect(result.proxies).toBeDefined();
        expect(result.proxies.length).toBe(3);
    });

    it('should extract correct proxy names from raw YAML', () => {
        const result = parseSubscriptionContent(gladosStyleYaml);

        const names = result.proxies.map(p => p.tag || p.name);
        expect(names).toContain('\u{1F1E8}\u{1F1F3}中国01');
        expect(names).toContain('\u{1F1FA}\u{1F1F8}美国01');
        expect(names).toContain('\u{1F1EF}\u{1F1F5}日本01');
    });

    it('should preserve SS proxy fields including plugin and plugin-opts', () => {
        const result = parseSubscriptionContent(gladosStyleYaml);

        const cnProxy = result.proxies.find(p => (p.tag || p.name) === '\u{1F1E8}\u{1F1F3}中国01');
        expect(cnProxy).toBeDefined();
        expect(cnProxy.type).toBe('shadowsocks');
        expect(cnProxy.server).toBe('cn1.example.com');
        expect(cnProxy.server_port).toBe(443);
        expect(cnProxy.method).toBe('chacha20-ietf-poly1305');
        expect(cnProxy.password).toBe('password123');
    });

    it('should preserve config overrides (proxy-groups, rules) from raw YAML', () => {
        const result = parseSubscriptionContent(gladosStyleYaml);

        expect(result.config).toBeDefined();
        expect(result.config['proxy-groups']).toBeDefined();
        expect(result.config['proxy-groups'].length).toBeGreaterThan(0);
    });

    it('should handle minimal raw YAML with just proxies', () => {
        const minimal = `proxies:
  - name: test-ss
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: testpass`;

        const result = parseSubscriptionContent(minimal);

        expect(result).toBeDefined();
        expect(result.type).toBe('yamlConfig');
        expect(result.proxies.length).toBe(1);
        expect(result.proxies[0].server).toBe('1.2.3.4');
    });
});

describe('Raw Surge INI subscription parsing', () => {
    it('should parse raw Surge config without corruption', () => {
        const surge = `[General]
loglevel = notify

[Proxy]
Direct = direct
HK = ss, 1.2.3.4, 8388, encrypt-method=aes-256-gcm, password=testpass, obfs=http, obfs-host=www.bing.com

[Rule]
FINAL,Proxy`;

        const result = parseSubscriptionContent(surge);

        expect(result).toBeDefined();
        expect(result.type).toBe('surgeConfig');
        expect(result.proxies).toBeDefined();
        expect(result.proxies.length).toBeGreaterThanOrEqual(1);
    });
});

describe('Raw Sing-Box JSON subscription parsing', () => {
    it('should parse raw Sing-Box JSON without Base64 encoding', () => {
        const singbox = JSON.stringify({
            outbounds: [
                {
                    type: 'shadowsocks',
                    tag: 'sg-node',
                    server: 'sg.example.com',
                    server_port: 443,
                    method: 'chacha20-ietf-poly1305',
                    password: 'testpass'
                },
                {
                    type: 'vmess',
                    tag: 'us-node',
                    server: 'us.example.com',
                    server_port: 443,
                    uuid: '12345678-1234-1234-1234-123456789abc',
                    security: 'auto',
                    alter_id: 0
                }
            ]
        });

        const result = parseSubscriptionContent(singbox);

        expect(result).toBeDefined();
        expect(result.type).toBe('singboxConfig');
        expect(result.proxies.length).toBe(2);
    });
});

describe('Edge cases', () => {
    it('should return empty array for empty content', () => {
        const result = parseSubscriptionContent('');
        expect(result).toEqual([]);
    });

    it('should return empty array for null content', () => {
        const result = parseSubscriptionContent(null);
        expect(result).toEqual([]);
    });

    it('should handle whitespace-prefixed raw YAML', () => {
        const padded = '   \n  \n' + `proxies:
  - name: ws-test
    type: ss
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-gcm
    password: testpass`;

        const result = parseSubscriptionContent(padded);
        expect(result).toBeDefined();
        expect(result.type).toBe('yamlConfig');
        expect(result.proxies.length).toBe(1);
    });

    it('should handle URI list fallback for non-config content', () => {
        const uriList = 'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@1.2.3.4:8388#test\nss://YWVzLTI1Ni1nY206cGFzc3dvcmQ@5.6.7.8:8388#test2';

        const result = parseSubscriptionContent(uriList);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
    });
});
