export const expectThrowsAsync = async (
    method: () => Promise<void>
): Promise<string | undefined> => {
    let error: null | Error = null;

    try {
        await method();
    } catch (err) {
        error = err;
    }

    if (error && error.message) {
        return error.message;
    } else {
        return undefined;
    }
};
