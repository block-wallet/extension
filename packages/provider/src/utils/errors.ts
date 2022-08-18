import { ProviderError } from '@block-wallet/background/utils/types/ethereum';
import { ethErrors } from 'eth-rpc-errors';

/**
 * Parse error messages
 *
 */
export const validateError = (error: string): Error => {
    switch (error) {
        case ProviderError.INVALID_PARAMS:
            return ethErrors.rpc.invalidParams();
        case ProviderError.RESOURCE_UNAVAILABLE:
            return ethErrors.rpc.resourceUnavailable();
        case ProviderError.TRANSACTION_REJECTED:
            return ethErrors.provider.userRejectedRequest({
                message: 'User rejected transaction',
            });
        case ProviderError.UNAUTHORIZED:
            return ethErrors.provider.unauthorized();
        case ProviderError.UNSUPPORTED_METHOD:
            return ethErrors.provider.unsupportedMethod();
        case ProviderError.USER_REJECTED_REQUEST:
            return ethErrors.provider.userRejectedRequest();
        default:
            return ethErrors.rpc.internal(error);
    }
};
