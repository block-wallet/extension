/**
 * escape string to avoid malicious attack
 * @param text
 * @returns escaped text
 */
const _escape = (text: string | null): string | null => {
    if (!text) return text
    return String(text)
        .replace(/</g, "&lt;")
        .replace(/'/g, "&#39;")
        .replace(/"/g, "&quot;")
        .replace(/>/g, "&gt;")
        .replace(/&/g, "&amp;")
}

const getAllQueryParameters = () => {
    return new URLSearchParams(window.location.search)
}

const getQueryParameter = (paramName: string): string | null => {
    return _escape(getAllQueryParameters().get(paramName))
}

export { getQueryParameter }
