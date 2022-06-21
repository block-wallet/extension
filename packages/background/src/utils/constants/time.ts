export type Duration = number;

export const INSTANT: Duration = 0;
export const MILISECOND: Duration = INSTANT + 1;
export const SECOND: Duration = 1000 * MILISECOND;
export const MINUTE: Duration = 60 * SECOND;
export const HOUR: Duration = 60 * MINUTE;

/**
 * Time before closing the DApp popup
 */
export const DAPP_POPUP_CLOSING_TIMEOUT = 3 * SECOND;

/**
 * Timeout before cancelling a signing request
 */
export const SIGN_TRANSACTION_TIMEOUT = 3 * MINUTE;

export const currentTimestamp = (): number => new Date().getTime();
