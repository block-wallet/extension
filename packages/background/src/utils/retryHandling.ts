import log from 'loglevel';

export const retryHandling = async <T>(
    callback: () => Promise<T>,
    delay = 400,
    retries = 3
): Promise<T> => {
    let attempt = 0;

    const retry = async (): Promise<T> => {
        try {
            return await callback();
        } catch (error) {
            attempt++;

            if (attempt > retries) throw error;

            log.warn('Retrying request...', error);

            return new Promise((resolve) =>
                setTimeout(() => resolve(retry()), delay * attempt)
            );
        }
    };

    return await retry();
};
