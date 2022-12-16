import sinon from 'sinon';
import { BigNumber } from 'ethers';
import { Contract } from '@ethersproject/contracts';
import { ContractSignatureParser } from '../../../src/controllers/transactions/ContractSignatureParser';
import { Interface } from 'ethers/lib/utils';
import { expect } from 'chai';
import { getNetworkControllerInstance } from '../../mocks/mock-network-instance';
import httpClient from './../../../src/utils/http';

const CONTRACT_ABI =
    '[{"inputs":[{"internalType":"address","name":"_factoryV2","type":"address"},{"internalType":"address","name":"factoryV3","type":"address"},{"internalType":"address","name":"_positionManager","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveMax","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveMaxMinusOne","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveZeroThenMax","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveZeroThenMaxMinusOne","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"data","type":"bytes"}],"name":"callPositionManager","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"paths","type":"bytes[]"},{"internalType":"uint128[]","name":"amounts","type":"uint128[]"},{"internalType":"uint24","name":"maximumTickDivergence","type":"uint24"},{"internalType":"uint32","name":"secondsAgo","type":"uint32"}],"name":"checkOracleSlippage","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"uint24","name":"maximumTickDivergence","type":"uint24"},{"internalType":"uint32","name":"secondsAgo","type":"uint32"}],"name":"checkOracleSlippage","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"}],"internalType":"struct IV3SwapRouter.ExactInputParams","name":"params","type":"tuple"}],"name":"exactInput","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IV3SwapRouter.ExactInputSingleParams","name":"params","type":"tuple"}],"name":"exactInputSingle","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"}],"internalType":"struct IV3SwapRouter.ExactOutputParams","name":"params","type":"tuple"}],"name":"exactOutput","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IV3SwapRouter.ExactOutputSingleParams","name":"params","type":"tuple"}],"name":"exactOutputSingle","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"factoryV2","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getApprovalType","outputs":[{"internalType":"enum IApproveAndCall.ApprovalType","name":"","type":"uint8"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"}],"internalType":"struct IApproveAndCall.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"internalType":"struct IApproveAndCall.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"previousBlockhash","type":"bytes32"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"positionManager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"pull","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"}],"name":"swapExactTokensForTokens","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"}],"name":"swapTokensForExactTokens","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"sweepTokenWithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"sweepTokenWithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"int256","name":"amount0Delta","type":"int256"},{"internalType":"int256","name":"amount1Delta","type":"int256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"uniswapV3SwapCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"unwrapWETH9WithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"unwrapWETH9WithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"name":"wrapETH","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}]';

describe('Contract Signature Parser', () => {
    let contractSignatureParser: ContractSignatureParser;

    beforeEach(() => {
        sinon.stub(Contract.prototype);
        contractSignatureParser = new ContractSignatureParser(
            getNetworkControllerInstance()
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('Should lookup for a method signature correctly and default to contract registry', async () => {
        sinon
            .stub(httpClient, 'get')
            .callsFake(() => Promise.reject('Error fetching'));

        contractSignatureParser['signatureRegistry'] = {
            entries: (_: string) =>
                Promise.resolve(['transfer(address,uint256)']),
        } as any;

        const signature = await contractSignatureParser.lookup('0xa9059cbb');
        expect(signature![0]).to.be.equal('transfer(address,uint256)');
    });

    it('Should try to lookup for a method signature with no response and default with 4bytes result', async () => {
        contractSignatureParser['signatureRegistry'] = {
            entries: (_: string) => Promise.resolve(),
        } as any;

        sinon.stub(httpClient, 'get').callsFake(() =>
            Promise.resolve({
                count: 1,
                results: [{ text_signature: 'transfer(address,uint256)' }],
            })
        );

        const signature = await contractSignatureParser.lookup('0xa9059cbb');
        expect(signature![0]).to.be.equal('transfer(address,uint256)');
    });

    it('Should try to lookup for a method signature, throw and return undefined', async () => {
        sinon
            .stub(httpClient, 'get')
            .callsFake(() => Promise.reject('Error fetching'));

        contractSignatureParser['signatureRegistry'] = {
            entries: (_: string) => Promise.reject(''),
        } as any;

        const signature = await contractSignatureParser.lookup('0xa9059cbb');
        expect(signature).to.be.equal(undefined);
    });

    it('Should parse an approve function fragment', () => {
        const sig = 'approve(address,uint256)';
        const data =
            '0x095ea7b3000000000000000000000000413f3536eab14074e6b2a7813b22745e413688750000000000000000000000000000000000000000000000000000000006666666';

        const { args, functionFragment, name } =
            contractSignatureParser.parseFunctionFragment(data, sig)!;

        expect(name).to.be.not.undefined;
        expect(name).to.be.equal('approve');
        expect(functionFragment.inputs).to.be.not.undefined;
        expect(functionFragment.inputs.length).to.be.equal(2);
        expect(functionFragment.inputs[0].type).to.be.equal('address');
        expect(functionFragment.inputs[0].name).to.be.null;
        expect(functionFragment.inputs[1].type).to.be.equal('uint256');
        expect(functionFragment.inputs[1].name).to.be.null;
        expect(args[0]).to.be.equal(
            '0x413f3536eab14074e6b2a7813b22745E41368875'
        );
        expect(BigNumber.from('0x6666666').eq(args[1])).to.be.true;
    });

    it('Should parse a transfer function fragment', () => {
        const sig = 'transfer(address,uint256)';
        const data =
            '0xa9059cbb000000000000000000000000aa141a506f62a0e59a0fdfb0c986735c7665f0b9000000000000000000000000000000000000000000000000002386f26fc10000';

        const { args, functionFragment, name } =
            contractSignatureParser.parseFunctionFragment(data, sig)!;

        expect(name).to.be.not.undefined;
        expect(name).to.be.equal('transfer');
        expect(functionFragment.inputs).to.be.not.undefined;
        expect(functionFragment.inputs.length).to.be.equal(2);
        expect(functionFragment.inputs[0].type).to.be.equal('address');
        expect(functionFragment.inputs[0].name).to.be.null;
        expect(functionFragment.inputs[1].type).to.be.equal('uint256');
        expect(functionFragment.inputs[1].name).to.be.null;
        expect(args[0]).to.be.equal(
            '0xaA141A506F62a0E59A0FdfB0C986735C7665f0b9'
        );
        expect(BigNumber.from('0x2386f26fc10000').eq(args[1])).to.be.true;
    });

    it('Should parse a multicall function fragment', () => {
        const sig = 'multicall(uint256,bytes[])';
        const data =
            '0x5ae401dc0000000000000000000000000000000000000000000000000000000061f1a5fa00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000000000000000000000000000000000000000002710000000000000000000000000413f3536eab14074e6b2a7813b22745e413688750000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000065e2eaae01584db000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const { args, functionFragment, name } =
            contractSignatureParser.parseFunctionFragment(data, sig)!;

        expect(name).to.be.not.undefined;
        expect(name).to.be.equal('multicall');
        expect(functionFragment.inputs).to.be.not.undefined;
        expect(functionFragment.inputs.length).to.be.equal(2);
        expect(functionFragment.inputs[0].type).to.be.equal('uint256');
        expect(functionFragment.inputs[0].name).to.be.null;
        expect(functionFragment.inputs[1].type).to.be.equal('bytes[]');
        expect(functionFragment.inputs[1].name).to.be.null;
        expect(BigNumber.from('0x61f1a5fa').eq(args[0])).to.be.true;
        expect(Array.isArray(args[1])).to.be.true;
        expect(args[1].length).to.be.equal(1);
        expect(args[1][0]).to.be.equal(
            '0x04e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000000000000000000000000000000000000000002710000000000000000000000000413f3536eab14074e6b2a7813b22745e413688750000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000065e2eaae01584db0000000000000000000000000000000000000000000000000000000000000000'
        );
    });

    it('Should parse verified contract multicall', () => {
        const data =
            '0x5ae401dc0000000000000000000000000000000000000000000000000000000062266a3f00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f98400000000000000000000000000000000000000000000000000000000000027100000000000000000000000004d3703d6fa601b37b3a9cc71e9846eae2e9867b200000000000000000000000000000000000000000000000000470de4df8200000000000000000000000000000000000000000000000000000023aee7ea420042000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const contractInterface = new Interface(CONTRACT_ABI);

        const { args, functionFragment, name } =
            contractInterface.parseTransaction({
                data,
            });

        expect(name).to.be.not.undefined;
        expect(name).to.be.equal('multicall');
        expect(functionFragment.inputs).to.be.not.undefined;
        expect(functionFragment.inputs.length).to.be.equal(2);
        expect(functionFragment.inputs[0].type).to.be.equal('uint256');
        expect(functionFragment.inputs[0].name).to.be.equal('deadline');
        expect(functionFragment.inputs[1].type).to.be.equal('bytes[]');
        expect(functionFragment.inputs[1].name).to.be.equal('data');
        expect(BigNumber.from('0x62266a3f').eq(args[0])).to.be.true;
        expect(Array.isArray(args[1])).to.be.true;
        expect(args[1].length).to.be.equal(1);
        expect(args[1][0]).to.be.equal(
            '0x04e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f98400000000000000000000000000000000000000000000000000000000000027100000000000000000000000004d3703d6fa601b37b3a9cc71e9846eae2e9867b200000000000000000000000000000000000000000000000000470de4df8200000000000000000000000000000000000000000000000000000023aee7ea4200420000000000000000000000000000000000000000000000000000000000000000'
        );
    });

    it('Should get the method signature for an approve function fragment', () => {
        const sig = 'approve(address,uint256)';
        const data =
            '0x095ea7b3000000000000000000000000413f3536eab14074e6b2a7813b22745e413688750000000000000000000000000000000000000000000000000000000006666666';

        const parsedFragment = contractSignatureParser.parseFunctionFragment(
            data,
            sig
        )!;

        const { name, args } =
            contractSignatureParser.parseTransactionDescription(parsedFragment);

        expect(name).to.be.not.undefined;
        expect(name).to.be.equal('Approve');
        expect(args).to.be.not.undefined;
        expect(args.length).to.be.equal(2);
        expect(args[0].name).to.be.null;
        expect(args[0].type).to.be.equal('address');
        expect(args[0].value).to.be.equal(
            '0x413f3536eab14074e6b2a7813b22745E41368875'
        );
        expect(args[1].name).to.be.null;
        expect(args[1].type).to.be.equal('uint256');
        expect(BigNumber.from('0x6666666').eq(args[1].value)).to.be.true;
    });

    it('Should get the method signature for a transfer function fragment', () => {
        const sig = 'transfer(address,uint256)';
        const data =
            '0xa9059cbb000000000000000000000000aa141a506f62a0e59a0fdfb0c986735c7665f0b9000000000000000000000000000000000000000000000000002386f26fc10000';

        const parsedFragment = contractSignatureParser.parseFunctionFragment(
            data,
            sig
        )!;

        const { name, args } =
            contractSignatureParser.parseTransactionDescription(parsedFragment);

        expect(name).to.be.not.undefined;
        expect(name).to.be.equal('Transfer');
        expect(args).to.be.not.undefined;
        expect(args.length).to.be.equal(2);
        expect(args[0].name).to.be.null;
        expect(args[0].type).to.be.equal('address');
        expect(args[0].value).to.be.equal(
            '0xaA141A506F62a0E59A0FdfB0C986735C7665f0b9'
        );
        expect(args[1].name).to.be.null;
        expect(args[1].type).to.be.equal('uint256');
        expect(BigNumber.from('0x2386f26fc10000').eq(args[1].value)).to.be.true;
    });

    it('Should get the method signature for a multicall function fragment', () => {
        const sig = 'multicall(uint256,bytes[])';
        const data =
            '0x5ae401dc0000000000000000000000000000000000000000000000000000000061f1a5fa00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000000000000000000000000000000000000000002710000000000000000000000000413f3536eab14074e6b2a7813b22745e413688750000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000065e2eaae01584db000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const parsedFragment = contractSignatureParser.parseFunctionFragment(
            data,
            sig
        )!;

        const { name, args } =
            contractSignatureParser.parseTransactionDescription(parsedFragment);

        expect(name).to.be.not.undefined;
        expect(name).to.be.equal('Multicall');
        expect(args).to.be.not.undefined;
        expect(args.length).to.be.equal(2);
        expect(args[0].name).to.be.null;
        expect(args[0].type).to.be.equal('uint256');
        expect(BigNumber.from('0x61f1a5fa').eq(args[0].value)).to.be.true;
        expect(args[1].name).to.be.null;
        expect(args[1].type).to.be.equal('bytes[]');
        expect(Array.isArray(args[1].value)).to.be.true;
        expect(args[1].value[0]).to.be.equal(
            '0x04e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f9840000000000000000000000000000000000000000000000000000000000002710000000000000000000000000413f3536eab14074e6b2a7813b22745e413688750000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000065e2eaae01584db0000000000000000000000000000000000000000000000000000000000000000'
        );
    });

    it('Should get the method signature for a verified contract multicall', () => {
        const data =
            '0x5ae401dc0000000000000000000000000000000000000000000000000000000062266a3f00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f98400000000000000000000000000000000000000000000000000000000000027100000000000000000000000004d3703d6fa601b37b3a9cc71e9846eae2e9867b200000000000000000000000000000000000000000000000000470de4df8200000000000000000000000000000000000000000000000000000023aee7ea420042000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

        const contractInterface = new Interface(CONTRACT_ABI);

        const parsedTransaction = contractInterface.parseTransaction({
            data,
        });

        const { name, args } =
            contractSignatureParser.parseTransactionDescription(
                parsedTransaction
            );

        expect(name).to.be.not.undefined;
        expect(name).to.be.equal('Multicall');
        expect(args).to.be.not.undefined;
        expect(args.length).to.be.equal(2);
        expect(args[0].name).to.be.equal('deadline');
        expect(args[0].type).to.be.equal('uint256');
        expect(BigNumber.from('0x62266a3f').eq(args[0].value)).to.be.true;
        expect(args[1].name).to.be.equal('data');
        expect(args[1].type).to.be.equal('bytes[]');
        expect(Array.isArray(args[1].value)).to.be.true;
        expect(args[1].value[0]).to.be.equal(
            '0x04e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001f9840a85d5af5bf1d1762f925bdaddc4201f98400000000000000000000000000000000000000000000000000000000000027100000000000000000000000004d3703d6fa601b37b3a9cc71e9846eae2e9867b200000000000000000000000000000000000000000000000000470de4df8200000000000000000000000000000000000000000000000000000023aee7ea4200420000000000000000000000000000000000000000000000000000000000000000'
        );
    });
});
