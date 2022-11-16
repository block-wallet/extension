import log from 'loglevel';

export const retryHandling = async <T>(
    callback: () => Promise<T>,
    delay = 400,
    retries = 3,
    shouldRetryCb: (error: Error) => boolean = () => true
): Promise<T> => {
    let attempt = 0;

    const retry = async (): Promise<T> => {
        try {
            return await callback();
        } catch (error) {
            attempt++;

            const shouldRetry = shouldRetryCb(error);

            if (!shouldRetry || attempt > retries) throw error;

            log.warn('Retrying request...', error);

            return new Promise((resolve) =>
                setTimeout(() => resolve(retry()), delay * attempt)
            );
        }
    };

    return await retry();
};
