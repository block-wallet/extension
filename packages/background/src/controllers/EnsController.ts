import log from 'loglevel';
import NetworkController from './NetworkController';

interface EnsControllerProps {
    networkController: NetworkController;
}

export class EnsController {
    private readonly _networkController: NetworkController;

    constructor(props: EnsControllerProps) {
        this._networkController = props.networkController;
    }

    /**
     * Returns the address for a given ENS name
     *
     * @param ensName to resolve
     */
    public resolveName = async (ensName: string): Promise<string | null> => {
        try {
            return this._resolveName(ensName);
        } catch (error) {
            log.warn(error.message || error);
            return null;
        }
    };

    /**
     * Returns ENS name for a given address
     *
     * @param address to lookup
     */
    public lookupAddress = async (address: string): Promise<string | null> => {
        try {
            return this._lookupAddress(address);
        } catch (error) {
            log.warn(error.message || error);
            return null;
        }
    };

    private _resolveName = async (ensName: string): Promise<string | null> => {
        return this._networkController.getProvider().resolveName(ensName);
    };

    private _lookupAddress = async (
        address: string
    ): Promise<string | null> => {
        return this._networkController.getProvider().lookupAddress(address);
    };
}
