import ethusd from './abis/eth-usd.abi.json';

type DataFeed_Contract = {
    address: string;
    abi: any;
};

type DataFeed_Contracts = {
    [key: string]: DataFeed_Contract;
};

const CHAINLINK_DATAFEEDS_CONTRACTS: DataFeed_Contracts = {
    'ETH/USD': ethusd,
};

export default CHAINLINK_DATAFEEDS_CONTRACTS;
