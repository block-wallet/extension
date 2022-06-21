import { mergeReducer } from "../reducerUtils"
describe("reducer utils tests", () => {
    describe("merge reducer tests", () => {
        test("should merge object with different properties", () => {
            const reducer = mergeReducer()
            expect(
                reducer(
                    {
                        someKey: 1,
                    },
                    {
                        newKey: 2,
                    }
                )
            ).toStrictEqual({
                someKey: 1,
                newKey: 2,
            })
        })
        test("should merge object with same properties", () => {
            const reducer = mergeReducer()

            expect(
                reducer(
                    {
                        firstKey: 1,
                        secondKey: 2,
                    },
                    {
                        thirdKey: 3,
                        secondKey: 20,
                    }
                )
            ).toStrictEqual({
                firstKey: 1,
                secondKey: 20,
                thirdKey: 3,
            })
        })
    })
})
