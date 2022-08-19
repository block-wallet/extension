/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export const toError = (error: any): Error => {
    let parsedError = error;
    if (!(error instanceof Error)) {
        if ('message' in error) {
            parsedError = new Error(error.message);
            parsedError.name = error.name;
        } else {
            parsedError = new Error(error);
        }
    }

    // Do not send back the stack trace to the client
    delete parsedError.stack;

    return parsedError;
};
