/**
 * Type declarations for Chrome's offscreen API
 * Based on documentation from https://developer.chrome.com/docs/extensions/reference/offscreen/
 */

declare namespace chrome {
    /**
     * Use the chrome.offscreen API to create and manage offscreen documents.
     */
    export namespace offscreen {
        /**
         * Valid reasons for creating an offscreen document
         */
        export type Reason =
            | 'AUDIO_PLAYBACK'
            | 'BATTERY_STATUS'
            | 'BLOBS'
            | 'CLIPBOARD'
            | 'DISPLAY_MEDIA'
            | 'DOM_PARSER'
            | 'DOM_SCRAPING'
            | 'GEOLOCATION'
            | 'IFRAME_SCRIPTING'
            | 'LOCAL_STORAGE'
            | 'MATCH_MEDIA'
            | 'TESTING'
            | 'USER_MEDIA'
            | 'WEB_RTC'
            | 'WORKERS';

        /**
         * Parameters for creating an offscreen document
         */
        export interface CreateDocumentParams {
            /**
             * The URL to load in the document.
             */
            url: string;

            /**
             * The reasons why the extension needs to create the document.
             */
            reasons: Reason[];

            /**
             * A developer-provided justification for the creation of the offscreen document.
             */
            justification?: string;
        }

        /**
         * Creates a new offscreen document for the extension.
         * @param parameters Parameters for creating the offscreen document.
         */
        export function createDocument(parameters: CreateDocumentParams): Promise<void>;

        /**
         * Closes the currently open offscreen document.
         */
        export function closeDocument(): Promise<void>;

        /**
         * Checks whether an offscreen document is currently open.
         */
        export function hasDocument(): Promise<boolean>;
    }
} 