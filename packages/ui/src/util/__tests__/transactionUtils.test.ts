import { flagQueuedTransactions } from "../transactionUtils"

describe("transaction utilties test", () => {
    describe("flag queued transactions tests", () => {
        test("should return the same object on empty input", () => {
            expect(flagQueuedTransactions([])).toStrictEqual([])
        })
        test("should flag non-queued transactions correclty", () => {
            const transactions = [
                {
                    transactionParams: {
                        nonce: 1,
                    },
                    status: "APPROVED",
                },
                {
                    transactionParams: {
                        nonce: 2,
                    },
                    status: "SUBMITTED",
                },
            ]
            expect(flagQueuedTransactions(transactions as any[])).toStrictEqual(
                [
                    {
                        transactionParams: {
                            nonce: 1,
                        },
                        status: "APPROVED",
                        isQueued: false,
                    },
                    {
                        transactionParams: {
                            nonce: 2,
                        },
                        status: "SUBMITTED",
                        isQueued: false,
                    },
                ]
            )
        })
        test("should flag non-queued transaction correclty with two submitted transactions with different nonce", () => {
            const transactions = [
                {
                    transactionParams: {
                        nonce: 1,
                    },
                    status: "APPROVED",
                },
                {
                    transactionParams: {
                        nonce: 2,
                    },
                    status: "SUBMITTED",
                },
                {
                    transactionParams: {
                        nonce: 3,
                    },
                    status: "SUBMITTED",
                },
            ] as any[]
            expect(flagQueuedTransactions(transactions)).toStrictEqual([
                {
                    transactionParams: {
                        nonce: 1,
                    },
                    status: "APPROVED",
                    isQueued: false,
                },
                {
                    transactionParams: {
                        nonce: 2,
                    },
                    status: "SUBMITTED",
                    isQueued: false,
                },
                {
                    transactionParams: {
                        nonce: 3,
                    },
                    status: "SUBMITTED",
                    isQueued: true,
                },
            ])
        })
        test("should flag queued transaction correclty with two submitted transactions have the same nonce", () => {
            const transactions = [
                {
                    transactionParams: {
                        nonce: 1,
                    },
                    status: "SUBMITTED",
                },
                {
                    transactionParams: {
                        nonce: 1,
                    },
                    status: "SUBMITTED",
                },
                {
                    transactionParams: {
                        nonce: 2,
                    },
                    status: "SUBMITTED",
                },
            ]
            expect(flagQueuedTransactions(transactions as any[])).toStrictEqual(
                [
                    {
                        transactionParams: {
                            nonce: 1,
                        },
                        status: "SUBMITTED",
                        isQueued: false,
                    },
                    {
                        transactionParams: {
                            nonce: 1,
                        },
                        status: "SUBMITTED",
                        isQueued: false,
                    },
                    {
                        transactionParams: {
                            nonce: 2,
                        },
                        status: "SUBMITTED",
                        isQueued: true,
                    },
                ]
            )
        })
    })
})
