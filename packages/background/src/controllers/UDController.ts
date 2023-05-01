import log from 'loglevel';
import NetworkController from './NetworkController';
import Resolution from '@unstoppabledomains/resolution';

interface UDControllerProps {
    networkController: NetworkController;
}

export class UDController {
    private readonly _networkController: NetworkController;
    private readonly _resolution: Resolution;

    constructor(props: UDControllerProps) {
        this._networkController = props.networkController;

        this._resolution = new Resolution({
            sourceConfig: {
                uns: {
                    locations: {
                        Layer1: {
                            url: this._networkController.searchNetworkByName(
                                'mainnet'
                            ).currentRpcUrl,
                            network: 'mainnet',
                        },
                        Layer2: {
                            url: this._networkController.searchNetworkByName(
                                'polygon'
                            ).currentRpcUrl,
                            network: 'polygon-mainnet',
                        },
                    },
                },
            },
        });
    }

    /**
     * Returns the address for a given UD name
     *
     * @param udName to resolve
     */
    public resolveName = async (udName: string): Promise<string | null> => {
        try {
            return this._resolveName(udName);
        } catch (error) {
            log.warn(error.message || error);
            return null;
        }
    };

    private _resolveName = async (udName: string): Promise<string | null> => {
        return await this._resolution
            .addr(udName, 'ETH')
            .then((address: string) => {
                return address;
            })
            .catch((error: any) => {
                log.warn(error.message || error);
                return null;
            });
    };
}
