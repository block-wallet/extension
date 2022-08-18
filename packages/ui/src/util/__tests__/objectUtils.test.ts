import { deepEqual, existsKeyInObject, getValueByKey } from "../objectUtils"
describe("object utils tests", () => {
    describe("DeepEqual tests", () => {
        test("should retrun that object with different properties are not equal", () => {
            expect(
                deepEqual(
                    {
                        a: 1,
                    },
                    {
                        b: 2,
                    }
                )
            ).toBeFalsy()
        })
        test("should retrun that object with same properties are not equal", () => {
            expect(
                deepEqual(
                    {
                        a: 1,
                    },
                    {
                        a: 2,
                    }
                )
            ).toBeFalsy()
        })
        test("should retrun that object with nested properties are not equal", () => {
            expect(
                deepEqual(
                    {
                        a: 1,
                        b: {
                            c: 1,
                        },
                    },
                    {
                        a: 1,
                        b: {
                            c: 2,
                        },
                    }
                )
            ).toBeFalsy()
        })
        test("should retrun that object with same properties are equal", () => {
            expect(
                deepEqual(
                    {
                        a: 1,
                    },
                    {
                        a: 1,
                    }
                )
            ).toBeTruthy()
        })
        test("should retrun that object with same nested properties are equal", () => {
            expect(
                deepEqual(
                    {
                        a: 1,
                        b: {
                            c: 1,
                        },
                    },
                    {
                        a: 1,
                        b: {
                            c: 1,
                        },
                    }
                )
            ).toBeTruthy()
        })
    })

    describe("existsKeyInObject tests", () => {
        test("should return that key exists in object", () => {
            expect(
                existsKeyInObject("a", {
                    a: 1,
                })
            ).toBeTruthy()
        })

        test("should return that key does not exist in object", () => {
            expect(
                existsKeyInObject("b", {
                    a: 1,
                })
            ).toBeFalsy()
        })
    })

    describe("getValueByKey tests", () => {
        test("should return value in object", () => {
            expect(
                getValueByKey({
                    a: 1,
                }, "a", 0)
            ).toBe(1)
        })

        test("should return default value if key does not exist in object", () => {

            type KeyValueType = {
                [key: string]: number;
            }

            const keyValueObject: KeyValueType = {
                "a": 1,
                "b": 2,
            }
            expect(
                getValueByKey(keyValueObject, "c", 3)
            ).toBe(3)
        })
    })
})
