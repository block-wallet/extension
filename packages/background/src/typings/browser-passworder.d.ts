declare module '@metamask/browser-passworder' {
    declare function encrypt<T>(password: string, dataObj: T): Promise<string>;
    declare function decrypt<T>(
        password: string,
        encryptedObj: string
    ): Promise<T>;

    declare interface Encryptor {
        encrypt<T>(password: string, dataObj: T): Promise<string>;
        decrypt<T>(password: string, encryptedObj: string): Promise<T>;
    }
}
