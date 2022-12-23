import { parseEther } from "@ethersproject/units"
import { TransactionMeta } from "@block-wallet/background/controllers/transactions/utils/types"

import {
    TransactionCategories,
    TransactionStatus,
    MetaType,
} from "../context/commTypes"

export const mockTransactions: TransactionMeta[] = [
    {
        id: "0",
        status: TransactionStatus.CONFIRMED,
        transactionParams: { value: parseEther("1.2") },
        time: 100000,
        loadingGasValues: true,
        blocksDropCount: 0,
        transactionCategory: TransactionCategories.SENT_ETHER,
        metaType: MetaType.REGULAR,
    },
    {
        id: "1",
        status: TransactionStatus.CONFIRMED,
        transactionParams: {},
        time: 100000,
        loadingGasValues: true,
        blocksDropCount: 0,
        transactionCategory: TransactionCategories.CONTRACT_INTERACTION,
        metaType: MetaType.REGULAR,
    },
    {
        id: "2",
        status: TransactionStatus.CONFIRMED,
        transactionParams: { value: parseEther("2.43") },
        time: 100000,
        loadingGasValues: true,
        blocksDropCount: 0,
        transactionCategory: TransactionCategories.INCOMING,
        metaType: MetaType.REGULAR,
    },
    {
        id: "3",
        status: TransactionStatus.CONFIRMED,
        transactionParams: {},
        time: 100000,
        loadingGasValues: true,
        blocksDropCount: 0,
        transactionCategory: TransactionCategories.TOKEN_METHOD_TRANSFER,
        metaType: MetaType.REGULAR,
    },
    {
        id: "4",
        status: TransactionStatus.CONFIRMED,
        transactionParams: {},
        time: 100000,
        loadingGasValues: true,
        blocksDropCount: 0,
        transactionCategory: TransactionCategories.BLANK_DEPOSIT,
        metaType: MetaType.REGULAR,
    },
    {
        id: "5",
        status: TransactionStatus.CONFIRMED,
        transactionParams: {},
        time: 100000,
        loadingGasValues: true,
        blocksDropCount: 0,
        transactionCategory: TransactionCategories.BLANK_WITHDRAWAL,
        metaType: MetaType.REGULAR,
    },
]
