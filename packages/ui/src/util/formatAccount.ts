const WALLET_ADDRESS_DEFAULT_LENGTH = 40

export const formatHash = (hash: string, chars: number = 4) => {
    if (hash.length < WALLET_ADDRESS_DEFAULT_LENGTH || hash.length === chars) {
        return hash
    } else {
        return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`
    }
}

export const formatName = (
    accountName: string | undefined,
    maxLength: number = 13
): string => {
    if (!accountName) {
        return "Account"
    } else {
        if (accountName.length < maxLength) {
            return accountName
        } else {
            return `${accountName.slice(0, maxLength - 3)}...`
        }
    }
}

export const formatHashLastChars = (hash: string, chars: number = 4) => {
    return `(...${hash.slice(-chars)})`
}

export const formatHashFirstLastChars = (
    hash: string,
    first: number = 6,
    last: number = 4
) => {
    if (first + last >= hash.length) {
        return hash
    }
    const firstPart = hash.slice(0, first)
    const lastPart = hash.slice(-last)
    return `(${firstPart}...${lastPart})`
}
