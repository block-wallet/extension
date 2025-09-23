export function truncateString(value: string, maxLength = 4096): string {
    if (typeof value !== "string") return "" + value;
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength) + "\u2026";
}

/**
 * Recursively sanitizes a value to ensure it's safe to render in JSON viewers.
 * - Removes non-plain objects (functions, symbols)
 * - Truncates long strings
 * - Drops circular references
 */
export function sanitizeTypedMessage(value: unknown, maxStringLength = 4096): unknown {
    const seen = new WeakSet<object>();

    function innerSanitize(v: unknown): unknown {
        if (v === null || v === undefined) return v;

        if (typeof v === "string") return truncateString(v, maxStringLength);
        if (typeof v === "number" || typeof v === "boolean") return v;
        if (typeof v === "bigint") return truncateString(v.toString(), maxStringLength);
        if (typeof v === "symbol" || typeof v === "function") return undefined;

        if (Array.isArray(v)) {
            return v.map((item) => innerSanitize(item));
        }

        if (typeof v === "object") {
            const obj = v as Record<string, unknown>;
            if (seen.has(obj)) return undefined;
            seen.add(obj);

            const out: Record<string, unknown> = {};
            for (const key of Object.keys(obj)) {
                if (key === "__proto__" || key === "constructor") continue;
                out[key] = innerSanitize(obj[key]);
            }
            return out;
        }

        return undefined;
    }

    return innerSanitize(value);
}

/**
 * Heuristic detection for SIWE messages represented as strings (personal_sign flow).
 * Looks for well-known SIWE fields in the textual payload.
 */
export function isLikelySiweString(raw: string): boolean {
    if (!raw || typeof raw !== "string") return false;
    const lowered = raw.toLowerCase();
    // Common SIWE markers
    const markers = [
        "sign in with ethereum",
        "uri:",
        "version:",
        "chain id:",
        "nonce:",
        "issued at:",
    ];
    return markers.every((m) => lowered.includes(m));
}

/**
 * Detection for SIWE typed data (EIP-712) objects.
 * Checks for presence of canonical SIWE fields inside the message object.
 */
export function isLikelySiweTypedData(message: unknown): boolean {
    if (!message || typeof message !== "object") return false;
    const m = message as Record<string, unknown>;
    const requiredKeys = ["domain", "uri", "version", "chainId", "nonce", "issuedAt"]; // address/statement optional
    return requiredKeys.every((k) => Object.prototype.hasOwnProperty.call(m, k));
}

export type SiweSummary = {
    domain?: string;
    address?: string;
    statement?: string;
    uri?: string;
    version?: string;
    chainId?: number | string;
    nonce?: string;
    issuedAt?: string;
};

/**
 * Extracts a concise SIWE summary from a typed data message object when present.
 */
export function extractSiweSummary(message: unknown): SiweSummary | null {
    if (!isLikelySiweTypedData(message)) return null;
    const m = message as Record<string, unknown>;
    const get = (key: string) => (m[key] == null ? undefined : (m[key] as any));
    return {
        domain: get("domain"),
        address: get("address"),
        statement: get("statement"),
        uri: get("uri"),
        version: get("version"),
        chainId: get("chainId"),
        nonce: get("nonce"),
        issuedAt: get("issuedAt"),
    };
}
