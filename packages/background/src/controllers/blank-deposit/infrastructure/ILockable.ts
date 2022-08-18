/**
 * A lockable object interface
 */
export interface ILockable {
    /**
     * @returns Whether the vault is unlocked or not
     */
    readonly isUnlocked: boolean;
    lock(): Promise<void>;
    unlock(password: string, ...args: any): Promise<void>;
}
