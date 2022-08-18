import { v4 as uuid } from 'uuid';

/**
 * A worker runner class that posts a data message to a worker and returns
 * a Promise of the first returned response
 */
export class WorkerRunner<T extends { [key in keyof T]: (data: any) => any }> {
    private readonly _worker: Worker;
    constructor(worker: Worker) {
        this._worker = worker;
    }

    /**
     * Runs a worker function
     *
     * @param name The function to execute name
     * @param data The data to send to the worker
     * @returns The response of the executed function
     */
    public run({
        name,
        data,
    }: {
        name: keyof T;
        data: Parameters<T[keyof T]>[0];
    }): Promise<ReturnType<T[keyof T]>> {
        return new Promise<ReturnType<T[keyof T]>>((resolve, reject) => {
            const id = uuid();
            const callback = ({
                data,
            }: MessageEvent<
                | { id: string; response: ReturnType<T[keyof T]> }
                | { id: string; error: string }
            >) => {
                if (data.id === id) {
                    if ('error' in data) {
                        reject(data.error);
                    } else {
                        resolve(data.response);
                    }
                    this._worker.removeEventListener('message', callback);
                }
            };
            this._worker.postMessage({ id, name, payload: data });
            this._worker.addEventListener('message', callback);
        });
    }
}
