import { mockApiResponse } from '../../../../mocks/mockApiResponse';

export const EtherscanNoRecordsFoundErrorResponse = mockApiResponse({
    status: '0',
    message: 'No records found',
    result: [],
});

export const EtherscanTornadoDepositGetLogsResponse = mockApiResponse({
    status: '1',
    message: 'OK-Missing/Invalid API Key, rate limit of 1/5sec applied',
    result: [
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x2625dc20493e9e592ed2d9886867acc029e736e940354cd370a3ec379b4f2ea5',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000e7000000000000000000000000000000000000000000000000000000006032b002',
            blockNumber: '0x41f98c',
            timeStamp: '0x6032b002',
            gasPrice: '0x2363e7f000',
            gasUsed: '0xf7558',
            logIndex: '0x',
            transactionHash:
                '0x2cfa209b040f7c2443182d6b0469105768235f1b583596c665a65b11f88d1396',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x1d89dc48e657d98758704f67f931f4ece3f25f2468a045ee67758e0e4a58a956',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000e800000000000000000000000000000000000000000000000000000000603311d0',
            blockNumber: '0x420011',
            timeStamp: '0x603311d0',
            gasPrice: '0x3b9aca00',
            gasUsed: '0xfa380',
            logIndex: '0x19',
            transactionHash:
                '0x294ea87d54c662039bfadaa8105cdc945f394aa534a00c16fd00703efbe89ce9',
            transactionIndex: '0xa',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x13f05e53430febca4c768db49bc166f2ea65770b6fd2f0228f4de1ff0f30b73f',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000e90000000000000000000000000000000000000000000000000000000060331f4a',
            blockNumber: '0x4200f7',
            timeStamp: '0x60331f4a',
            gasPrice: '0x205d0bae00',
            gasUsed: '0xf8c6c',
            logIndex: '0x',
            transactionHash:
                '0xb47fae63675cbc7203653337a3b4dc7a5eb175bb1de8e56e9d51f1e83f006ba7',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x2599ff50ae5420ac0a8653e1e72011ca97b0a818bd1bb8afa40b45b829bf078e',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000ea000000000000000000000000000000000000000000000000000000006033576d',
            blockNumber: '0x4204b5',
            timeStamp: '0x6033576d',
            gasPrice: '0x218711a000',
            gasUsed: '0xf8c6c',
            logIndex: '0x',
            transactionHash:
                '0xcf628fed6f28d717eabc50cd8efd6e87f8ac8b72d44711210ca8aa1d3c2581d1',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x145c777a1389c130ece08f3a7184ca9c53c97480cb676a40884a996c2084cab3',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000eb0000000000000000000000000000000000000000000000000000000060335821',
            blockNumber: '0x4204c1',
            timeStamp: '0x60335821',
            gasPrice: '0x214b76d600',
            gasUsed: '0xf7558',
            logIndex: '0x',
            transactionHash:
                '0x38eb3452789f9839c2619c965f938f8311e13e2e2e249640c95062d0b4b5fa28',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x0c5b46b7b5a41efa293c9ced56e64f6dbe9719c44754c7ee27903556c7dd0714',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000ec000000000000000000000000000000000000000000000000000000006033e267',
            blockNumber: '0x420df7',
            timeStamp: '0x6033e267',
            gasPrice: '0x9237b78800',
            gasUsed: '0xf8c6c',
            logIndex: '0x',
            transactionHash:
                '0x9dfe78f0faa06ecec253123d6b3aaf988d811a57c3f7968c55b1b62d1ecf7adf',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x2f4268d43cd064a8a09a99de4b94580936567e332f951329cc65518a440d9d28',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000ed000000000000000000000000000000000000000000000000000000006034635e',
            blockNumber: '0x421690',
            timeStamp: '0x6034635e',
            gasPrice: '0x3deed5e400',
            gasUsed: '0xf7558',
            logIndex: '0x',
            transactionHash:
                '0xf063bc5b0f37f57e7c826793fdfaad3a1d260e7fd3a1d8d06598d5f2e1cec7f2',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x1bd07eab454ec957bda667aeb4a53c52e74a5a17fc8d872b9d2129ec9ed9a149',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000ee000000000000000000000000000000000000000000000000000000006034daf2',
            blockNumber: '0x421e88',
            timeStamp: '0x6034daf2',
            gasPrice: '0xa9bbc93a00',
            gasUsed: '0xf8ce0',
            logIndex: '0x',
            transactionHash:
                '0x853688323a52ee96b6c98b1d9c736b33bbebfd301bcb05e1ffb1e9d266ae053c',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x0e32787e4a04676c4e53e0e1c060bb6ec6baf76ac525985d3bd2162d3f77d12c',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000ef000000000000000000000000000000000000000000000000000000006034efec',
            blockNumber: '0x421fee',
            timeStamp: '0x6034efec',
            gasPrice: '0xa6f087c200',
            gasUsed: '0xf5e44',
            logIndex: '0x',
            transactionHash:
                '0xeb6c81d333709958acdb6cf9f0616f6150b1ae980437280f9195bd10c151a4f4',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x147be2abd9129d973074abe4837246a13c8d331e2e557301ddeea3880af68a79',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000f00000000000000000000000000000000000000000000000000000000060354823',
            blockNumber: '0x4225cf',
            timeStamp: '0x60354823',
            gasPrice: '0x35c8ac4600',
            gasUsed: '0xfa380',
            logIndex: '0x',
            transactionHash:
                '0x7c1e3c4d858360c8e6f59a3ba2e10607b7026d913b2aa535cfcb8f8d9f6ad2a9',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x2d5b47af54af6ef3abb9cde63f0615aec07e4139757731280aba6ddb72480f6b',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000f10000000000000000000000000000000000000000000000000000000060354af3',
            blockNumber: '0x4225ff',
            timeStamp: '0x60354af3',
            gasPrice: '0x36b7176e00',
            gasUsed: '0xfa3dc',
            logIndex: '0x',
            transactionHash:
                '0x6099151b62e376b73f5a6d8d4e0f6f9dacadb810c7643413b9a7b25952d1ca31',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x1b17bff24f9a266e34a230f575fc9ef86bb3d8f30fa689d770c1dfdde49d0d3a',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000f2000000000000000000000000000000000000000000000000000000006035cd03',
            blockNumber: '0x422eaa',
            timeStamp: '0x6035cd03',
            gasPrice: '0xba43b7400',
            gasUsed: '0xf8c6c',
            logIndex: '0x',
            transactionHash:
                '0x362080506036f8022b399b0d37d0a8e89d5566a3928318b1a4d14cdc01943143',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x0fd0e59ad12a74d70c93ac55c1eda9ca0fd4f9d77518309fa658c6ccea55ba2a',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000f30000000000000000000000000000000000000000000000000000000060363746',
            blockNumber: '0x4235bf',
            timeStamp: '0x60363746',
            gasPrice: '0x2540be400',
            gasUsed: '0xf7558',
            logIndex: '0x1',
            transactionHash:
                '0x29b269e734369e3e3cbafe7b7309ae873a2df9a4dad681fe39318ffe2454c056',
            transactionIndex: '0x1',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x18989475db17b8fef017ecba0f63b38b75719dd97c6690f8442b86caa2d6ad8c',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000f40000000000000000000000000000000000000000000000000000000060373cb7',
            blockNumber: '0x42472b',
            timeStamp: '0x60373cb7',
            gasPrice: '0x28fa6ae000',
            gasUsed: '0xf8c6c',
            logIndex: '0x2',
            transactionHash:
                '0x59bf95e5282650184f7178c584464a94d6cd522eff8e3431084054ef5242cc8c',
            transactionIndex: '0x1',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x2ed5456072d086770ae2fb6f57a160d5200369e56f0e0fa49efb6766409fa761',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000f50000000000000000000000000000000000000000000000000000000060375c3f',
            blockNumber: '0x424944',
            timeStamp: '0x60375c3f',
            gasPrice: '0x24c988ac00',
            gasUsed: '0xf8cbc',
            logIndex: '0x',
            transactionHash:
                '0xd55b9867525e64bb99b325fd0b183fcb14d2c7288926fe94e4bdedb0e9940bc9',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x1bdc3dbdb16d7af890891f0486cb7007ea570517f3512a0d598b4d4346cc6f68',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000000f6000000000000000000000000000000000000000000000000000000006037d9d4',
            blockNumber: '0x4251a1',
            timeStamp: '0x6037d9d4',
            gasPrice: '0x3893edbe00',
            gasUsed: '0xf8ce0',
            logIndex: '0x',
            transactionHash:
                '0x60ca9798f721abc3d787f80c319eefab782bf2ab9370fd5b7b39483697b2b5b1',
            transactionIndex: '0x',
        },
    ],
});

export const EtherscanTornadoWithdrawalGetLogsResponse = mockApiResponse({
    status: '1',
    message: 'OK-Missing/Invalid API Key, rate limit of 1/5sec applied',
    result: [
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x0000000000000000000000001129e19e41c2f7f66804cfd9ca5c5b378b7fa52a',
            ],
            data: '0x000000000000000000000000b7253b640d10963c6e7781f0c554bcaeb2c13e26207a5be3513df873c43dffeb63c27c90d368339839e5114b6cd5e3eea83bf56700000000000000000000000000000000000000000000000000d3751fe9080000',
            blockNumber: '0x41f993',
            timeStamp: '0x6032b06b',
            gasPrice: '0x21c2ac6a00',
            gasUsed: '0x5e4d5',
            logIndex: '0x',
            transactionHash:
                '0xf2fe6607a47722a52fc77a710259476e68364aeec3c616e8d09cf4f4618dc922',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x00000000000000000000000068d4ba916e0aa1ea4c5b08e2a7e4980de713eee6',
            ],
            data: '0x0000000000000000000000007975715da05b68f1403ea0ae4102ca50b1e97b2b2c3e5b7542c03f12449b2aa7e60a52c1a4d7b3df24d8b54cb1ebf1c91f75d82000000000000000000000000000000000000000000000000000d2df0edaa4b000',
            blockNumber: '0x420004',
            timeStamp: '0x6033110d',
            gasPrice: '0x21e079cf00',
            gasUsed: '0x58345',
            logIndex: '0x',
            transactionHash:
                '0x97507a92bb1c2b69ea1c01dbcfceebb1680e3ec3f5a72d5b96fe59540d46dcad',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x0000000000000000000000007975715da05b68f1403ea0ae4102ca50b1e97b2b',
            ],
            data: '0x0000000000000000000000007975715da05b68f1403ea0ae4102ca50b1e97b2b001a7bbca44da2d021849f08e51107dd9b9771925fc4530c273aad27f2a586ca0000000000000000000000000000000000000000000000000000000000000000',
            blockNumber: '0x42001f',
            timeStamp: '0x603312a2',
            gasPrice: '0x3b9aca00',
            gasUsed: '0x56585',
            logIndex: '0x6',
            transactionHash:
                '0x68e69dfed52276b1a6200a372c527a74dcc1d57d58db35eccf204261b43e122c',
            transactionIndex: '0x4',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x00000000000000000000000068d4ba916e0aa1ea4c5b08e2a7e4980de713eee6',
            ],
            data: '0x000000000000000000000000eb88be1e786b79fa5d8c50c34540ff2783e5e805227cf7028b3551adcb77a78786f36b6fb9e5785dfbe01251d18805e75003a0550000000000000000000000000000000000000000000000000355bc1fd2c01000',
            blockNumber: '0x420dd9',
            timeStamp: '0x6033e0a5',
            gasPrice: '0x8a5023a480',
            gasUsed: '0x5832d',
            logIndex: '0x',
            transactionHash:
                '0xe34a3e968fd8744b341c2f2ab74408fb119882a0cef870395c3fbd2407ce8c5f',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x000000000000000000000000a0f0287683e820ff4211e67c03cf46a87431f4e1',
            ],
            data: '0x000000000000000000000000dd4c48c0b24039969fc16d1cdf626eab821d3384210c47eddcff2c96db83869428f9bf2269789afa30382ce01613bd68d1d08d01000000000000000000000000000000000000000000000000035c0a7a373a0000',
            blockNumber: '0x420e0f',
            timeStamp: '0x6033e3cf',
            gasPrice: '0x8ba56035c0',
            gasUsed: '0x5832d',
            logIndex: '0x',
            transactionHash:
                '0xd955abe94bc0f880aa8c8c3ee6a940bca81fc4972ca8e2a150a40f6e99c30859',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x000000000000000000000000c7e351a23d54139f0cccc5e72c35c65057a83036',
            ],
            data: '0x000000000000000000000000c7e351a23d54139f0cccc5e72c35c65057a83036054248d8f3ae55e47ec328cf2545f2d64e585f659eb4439fbc23ce4e2d9af8ef000000000000000000000000000000000000000000000000016ce63368e16000',
            blockNumber: '0x421696',
            timeStamp: '0x603463b8',
            gasPrice: '0x3b298a4d00',
            gasUsed: '0x58351',
            logIndex: '0x',
            transactionHash:
                '0xbd6459d9a1b91fa9ca560d6679e2cb898c4adfe2476a99ddb087246b57575827',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x0000000000000000000000007542be8193a34b984903a92e36e8c6f5a4a63c17',
            ],
            data: '0x000000000000000000000000dd4c48c0b24039969fc16d1cdf626eab821d33842674489e1b934fd40317de72e13b7b430924bd2888b387c743f4b4401597443f00000000000000000000000000000000000000000000000003e6e613ec45d000',
            blockNumber: '0x421e8d',
            timeStamp: '0x6034db3d',
            gasPrice: '0xa2486ffa00',
            gasUsed: '0x5835d',
            logIndex: '0x',
            transactionHash:
                '0x0776a9fd5e19a00498ae1f90d2442ac7f21abc0589a34225c2171a3411d6e61c',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x00000000000000000000000085ec6f247fbc7f44ea36bd26312da29fbc04399b',
            ],
            data: '0x000000000000000000000000eca0a3efcf009519052dc92306fe821b9c7a32a20f7fc4d89c48fa6bd8854a2fbafff17098d9dc1476415599b16b335f4650ded200000000000000000000000000000000000000000000000003da890948745000',
            blockNumber: '0x421ff4',
            timeStamp: '0x6034f046',
            gasPrice: '0x9fcf2357c0',
            gasUsed: '0x5e4ed',
            logIndex: '0x',
            transactionHash:
                '0x1c49238ba905206480dc5099980e04d4b68f4833e40d163898a0883d7532c7bf',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x0000000000000000000000007542be8193a34b984903a92e36e8c6f5a4a63c17',
            ],
            data: '0x000000000000000000000000eb88be1e786b79fa5d8c50c34540ff2783e5e8051f81600a51440e91cad01410967eadd9e1679e8519a4f10bef39d3d40b18edb80000000000000000000000000000000000000000000000000134299207d14000',
            blockNumber: '0x42264a',
            timeStamp: '0x60354f5c',
            gasPrice: '0x31a7210757',
            gasUsed: '0x58351',
            logIndex: '0x',
            transactionHash:
                '0x378771475e51f31b96a8fd546217d21ead03570d4cba5b8b2f98771d8d99a007',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x0000000000000000000000004cc03b9a414fd9ff1c00e851f18d5fb9e1e4e0c2',
            ],
            data: '0x0000000000000000000000001031a1c7cc8edc64cae561dcea4285f8ab97e02f1825a79ef0a33859a2bae697360423d929779306a0ab5ea0b4ecb660e813aff400000000000000000000000000000000000000000000000000ae1e55d8712000',
            blockNumber: '0x42365f',
            timeStamp: '0x603640a7',
            gasPrice: '0x1bf08eb000',
            gasUsed: '0x5e4ed',
            logIndex: '0x',
            transactionHash:
                '0x2ff2e7e485491775d21db58f4742398988e2a6606b2d25905f99d374469f41db',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x000000000000000000000000b0ce77b18b8663baa0d6be63b7c5ee0bdf933001',
            ],
            data: '0x000000000000000000000000b0ce77b18b8663baa0d6be63b7c5ee0bdf9330010266dad7a2dffcf5db7f65fa00c8be4affe0605db22eb6b32cdba6c6c2cbb9bb000000000000000000000000000000000000000000000000019d7b8a762f1000',
            blockNumber: '0x423b51',
            timeStamp: '0x60368ad7',
            gasPrice: '0x414033a280',
            gasUsed: '0x58339',
            logIndex: '0x',
            transactionHash:
                '0xbcd55b051e11ee6bcea6470e8bd107da2edef63e81d59b18a6f831c4325ab035',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x00000000000000000000000044c09809fe20787f3237a8fe46f811088e526f92',
            ],
            data: '0x00000000000000000000000044c09809fe20787f3237a8fe46f811088e526f92129af4bb678be9ada6ab69bd7dde25913991671abf90cf13cc20af596400684c0000000000000000000000000000000000000000000000000000000000000000',
            blockNumber: '0x424745',
            timeStamp: '0x60373e3d',
            gasPrice: '0x29ad3b3e00',
            gasUsed: '0x56579',
            logIndex: '0x',
            transactionHash:
                '0x11b62d6884176a134c762f1611ffb88b07ea1368d0d79ae46128609f948a7273',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x00000000000000000000000020bb3095a4852f4c97d7a188e9f7183c85acfc49',
            ],
            data: '0x000000000000000000000000dd4c48c0b24039969fc16d1cdf626eab821d338427e82c12d3ffd8943ff227617f4405fa36619e27c0bdff08713a206194c6720800000000000000000000000000000000000000000000000000d9e34f60132000',
            blockNumber: '0x42494d',
            timeStamp: '0x60375cc6',
            gasPrice: '0x22f5757a2f',
            gasUsed: '0x58345',
            logIndex: '0x',
            transactionHash:
                '0x133dcfa63c461ea05ed217849a6cb2699d96365e2efbb5498babb1db15e37c1a',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x00000000000000000000000085ec6f247fbc7f44ea36bd26312da29fbc04399b',
            ],
            data: '0x000000000000000000000000eb88be1e786b79fa5d8c50c34540ff2783e5e8050998d3c2968c782385063eecb0a046827fec9ed8e89654e27c058c7aaff49acc000000000000000000000000000000000000000000000000014cbab9ee707000',
            blockNumber: '0x4251a5',
            timeStamp: '0x6037da10',
            gasPrice: '0x35c8ac4600',
            gasUsed: '0x58339',
            logIndex: '0x',
            transactionHash:
                '0x1739e6c02e651935cede576747a6cb09164e4c6c22504b464e55cd78dcee4bfd',
            transactionIndex: '0x',
        },
        {
            address: '0x3aac1cc67c2ec5db4ea850957b967ba153ad6279',
            topics: [
                '0xe9e508bad6d4c3227e881ca19068f099da81b5164dd6d62b2eaf1e8bc6c34931',
                '0x0000000000000000000000004cc03b9a414fd9ff1c00e851f18d5fb9e1e4e0c2',
            ],
            data: '0x000000000000000000000000eb88be1e786b79fa5d8c50c34540ff2783e5e8050582312a83883b17b4c5020b56b59d42c6dcff867b61595b3e4c0f75a46044c700000000000000000000000000000000000000000000000000e4d48dc1fba000',
            blockNumber: '0x425363',
            timeStamp: '0x6037f433',
            gasPrice: '0x24c988ac00',
            gasUsed: '0x58339',
            logIndex: '0x',
            transactionHash:
                '0xdd3122d5d2da102bed871c64f938fb6cdaaf4a87d24365a6fecf6518aef3c90b',
            transactionIndex: '0x',
        },
    ],
});

export const DepositEventsFromZeroBlockResponse = mockApiResponse({
    status: '1',
    message: 'OK-Missing/Invalid API Key, rate limit of 1/5sec applied',
    result: [
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x0d1c2fcf7ad5f5accfa3fe116ece332103bd698a450151afccf36a14b51b08f2',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005df80f67',
            blockNumber: '0x8b206a',
            timeStamp: '0x5df80f67',
            gasPrice: '0x306dc4200',
            gasUsed: '0xfd7a3',
            logIndex: '0x24',
            transactionHash:
                '0x88b566ff0fa434f377d9056f176f569b7f84ba69a137e6d3681352676d723897',
            transactionIndex: '0x34',
        },
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x0e64ce58abcacd4dbe952fa0cca256091aa3079ead4fe5791cdec2786d046836',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000005df8c16b',
            blockNumber: '0x8b2ac1',
            timeStamp: '0x5df8c16b',
            gasPrice: '0x37e11d600',
            gasUsed: '0xf85f7',
            logIndex: '0x92',
            transactionHash:
                '0x83645c7b74a5b6778d12a137204d882340d2f294f314f27978bfa3c9bc79402e',
            transactionIndex: '0x76',
        },
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x0f0847d41b88ddda39b62d20019b8c831a0bb43e69d60d2d1bb51cc5513c0ae2',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000005df927d0',
            blockNumber: '0x8b30dd',
            timeStamp: '0x5df927d0',
            gasPrice: '0xee6b2800',
            gasUsed: '0xf85f7',
            logIndex: '0x47',
            transactionHash:
                '0xfe76491919cc9f03c7394926cc63952b61dcc2aab4338561b305c65b5c6378b5',
            transactionIndex: '0x9e',
        },
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x250f914925b41c0e4b0531d574ef68f65cc6d5994faa38f3eccc65afd64c0769',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000005df92f68',
            blockNumber: '0x8b313f',
            timeStamp: '0x5df92f68',
            gasPrice: '0x306dc4200',
            gasUsed: '0xf6ee3',
            logIndex: '0x34',
            transactionHash:
                '0xe02be05f4d5be980dbb9690f169c6ec6b195fd1e65425a89f3556310b78f0ac4',
            transactionIndex: '0x8',
        },
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x20c494da82771b0bb6b504d202854524b818af8fcbe4b027b1884dccd853304f',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000005df93726',
            blockNumber: '0x8b31a4',
            timeStamp: '0x5df93726',
            gasPrice: '0x37e11d600',
            gasUsed: '0xf85f7',
            logIndex: '0x2',
            transactionHash:
                '0xaffbc49e2e8eda7d848794f8aad0469be475997f4566e76d82d16d2b50c11e8e',
            transactionIndex: '0x3',
        },
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x1595273ec49b51c7b01fed791cd5c8dfd14546d6afd4805b2c7bca91c73a97c6',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000005df943a9',
            blockNumber: '0x8b3269',
            timeStamp: '0x5df943a9',
            gasPrice: '0x2540be400',
            gasUsed: '0xf6ee3',
            logIndex: '0x16',
            transactionHash:
                '0xad57b56c8f9173cc19447e1af4c9a03b8b75f1445f1eaecc64c546c89b3c7781',
            transactionIndex: '0x16',
        },
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x1073a889df074edc1c7ea47e8ccf7c0e1831f017f39299832727df5e8d008dc6',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000005df98ec3',
            blockNumber: '0x8b369c',
            timeStamp: '0x5df98ec3',
            gasPrice: '0x1dcd65000',
            gasUsed: '0xf6ed7',
            logIndex: '0x26',
            transactionHash:
                '0x106c4f343b5f220dbf7f52039168099762fa5ec443da1d6beca4a018b29604e6',
            transactionIndex: '0x25',
        },
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x26ef1777185db5920b6cdaf9c381be744da1eb3e581a2316f51b4b58a520db4e',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000007000000000000000000000000000000000000000000000000000000005df996b3',
            blockNumber: '0x8b370e',
            timeStamp: '0x5df996b3',
            gasPrice: '0x12a05f200',
            gasUsed: '0xf57cf',
            logIndex: '0x51',
            transactionHash:
                '0x44f100c6819fbed216aa5924877bd6e39fac3dc31dfb187ae6cf7578790c8845',
            transactionIndex: '0x89',
        },
        {
            address: '0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936',
            topics: [
                '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196',
                '0x172aa74782017af7b377c56ee06ed8f94b599303872f18cc574d7f2ab8e2096a',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000005df9e1ca',
            blockNumber: '0x8b3b6d',
            timeStamp: '0x5df9e1ca',
            gasPrice: '0x1788222fe',
            gasUsed: '0xf85f7',
            logIndex: '0x5d',
            transactionHash:
                '0xb4eca7fe2a8c87efd50637dcda4be699fc239752214efc88f798b8bd49c312d8',
            transactionIndex: '0x51',
        },
    ],
});
