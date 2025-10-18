// Small helper to hash a string using Web Crypto API (SHA-256)
// Returns a hex string representation of the digest
export async function sha256Hex(message) {
    if (typeof message !== 'string') message = String(message);
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export default sha256Hex;
