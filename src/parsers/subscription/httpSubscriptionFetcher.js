import { decodeBase64 } from '../../utils.js';
import { parseSubscriptionContent } from './subscriptionContentParser.js';

/**
 * Check if a string looks like valid Base64 encoded content.
 * Base64 only contains [A-Za-z0-9+/] and optional = padding.
 * @param {string} text - Input text to check
 * @returns {boolean} - True if text appears to be Base64
 */
function looksLikeBase64(text) {
    const cleaned = text.replace(/\s/g, '');
    if (cleaned.length === 0) return false;
    if (!/^[A-Za-z0-9+/]+=*$/.test(cleaned)) return false;
    if (cleaned.length % 4 !== 0) return false;
    return true;
}

/**
 * Check if a string appears to be valid readable text
 * (mostly printable characters or common whitespace).
 * Used to validate Base64 decode results.
 * @param {string} str - String to check
 * @returns {boolean} - True if string is mostly readable
 */
function isReadableText(str) {
    const sample = str.slice(0, Math.min(str.length, 2000));
    if (sample.length === 0) return true;
    let printable = 0;
    for (let i = 0; i < sample.length; i++) {
        const code = sample.charCodeAt(i);
        if (code >= 32 || code === 9 || code === 10 || code === 13 || code > 127) {
            printable++;
        }
    }
    return (printable / sample.length) > 0.9;
}

/**
 * Decode content, trying Base64 first, then URL decoding if needed.
 * Includes validation to avoid corrupting plain-text content (e.g. raw Clash YAML).
 * @param {string} text - Raw text content
 * @returns {string} - Decoded content
 */
function decodeContent(text) {
    const trimmed = text.trim();

    if (trimmed.startsWith('{') || trimmed.includes('proxies:') || /\[Proxy\]/i.test(trimmed)) {
        return trimmed;
    }

    if (looksLikeBase64(trimmed)) {
        try {
            const decoded = decodeBase64(trimmed);
            if (isReadableText(decoded)) {
                return decoded;
            }
        } catch (_) {}
    }

    if (trimmed.includes('%')) {
        try {
            return decodeURIComponent(trimmed);
        } catch (_) {}
    }

    return trimmed;
}

/**
 * Detect the format of subscription content
 * @param {string} content - Decoded subscription content
 * @returns {'clash'|'singbox'|'unknown'} - Detected format
 */
function detectFormat(content) {
    const trimmed = content.trim();

    // Try JSON (Sing-Box format)
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.outbounds || parsed.inbounds || parsed.route) {
                return 'singbox';
            }
        } catch {
            // Not valid JSON
        }
    }

    // Try YAML (Clash format) - check for proxies: key
    if (trimmed.includes('proxies:')) {
        return 'clash';
    }

    return 'unknown';
}

/**
 * Fetch subscription content from a URL and parse it
 * @param {string} url - The subscription URL to fetch
 * @param {string} userAgent - Optional User-Agent header
 * @returns {Promise<object|string[]|null>} - Parsed subscription content
 */
export async function fetchSubscription(url, userAgent) {
    try {
        const headers = new Headers();
        if (userAgent) {
            headers.set('User-Agent', userAgent);
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const decodedText = decodeContent(text);

        return parseSubscriptionContent(decodedText);
    } catch (error) {
        console.error('Error fetching or parsing HTTP(S) content:', error);
        return null;
    }
}

/**
 * Fetch subscription content and detect its format without parsing
 * @param {string} url - The subscription URL to fetch
 * @param {string} userAgent - Optional User-Agent header
 * @returns {Promise<{content: string, format: 'clash'|'singbox'|'unknown', url: string, subscriptionUserinfo?: string}|null>}
 */
export async function fetchSubscriptionWithFormat(url, userAgent) {
    try {
        const headers = new Headers();
        if (userAgent) {
            headers.set('User-Agent', userAgent);
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const content = decodeContent(text);
        const format = detectFormat(content);

        const subscriptionUserinfo = response.headers.get('subscription-userinfo') || undefined;

        return { content, format, url, subscriptionUserinfo };
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return null;
    }
}
