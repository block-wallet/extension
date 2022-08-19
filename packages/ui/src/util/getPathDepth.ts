export const getPathDepth = (path: string | undefined): number => {
    if (!path)
        return 0
    return path.split('/').filter(p => p !== '').length
}