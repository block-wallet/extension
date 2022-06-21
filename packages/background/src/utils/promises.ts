import log from 'loglevel';

/**
 * timeout promise
 *
 * @param prom The promise to run
 * @param time The timeout
 */
export const timeout = <T>(
    prom: Promise<T>,
    time: number
): Promise<T | void> => {
    let timer: NodeJS.Timeout;
    return Promise.race([
        prom,
        new Promise<void>((_r, rej) => (timer = setTimeout(rej, time))),
    ]).finally(() => clearTimeout(timer));
};

/**
 * runPromiseSafely
 * It runs a promise preventing rejection if an error occurs
 *
 * @param prom The promise to run
 */
export const runPromiseSafely = async <T>(
    prom: Promise<T>
): Promise<T | void> => {
    try {
        return await prom;
    } catch (error) {
        log.debug(error.message);
        return;
    }
};
