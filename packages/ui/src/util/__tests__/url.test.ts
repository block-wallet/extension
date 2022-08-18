import { getQueryParameter } from "../url"

describe("URL utils test", () => {
    describe("Query parameters test", () => {
        let windowSpy: any

        beforeEach(() => {
            windowSpy = jest.spyOn(window, "window", "get")
        })

        afterEach(() => {
            windowSpy.mockRestore()
        })
        test("Should return null when the query parameter does not exists", () => {
            windowSpy.mockImplementation(() => ({
                location: {
                    search: "?defaultNetwork=kovan",
                },
            }))
            expect(getQueryParameter("my_custom_param")).toBeNull()
        })
        test("Should return kovan when the getting the default network parameter", () => {
            windowSpy.mockImplementation(() => ({
                location: {
                    search: "?defaultNetwork=kovan",
                },
            }))
            expect(getQueryParameter("defaultNetwork")).toStrictEqual("kovan")
        })
        test("Should escape characters to avoid malicious code", () => {
            const maliciousCode = "<script>alert('Hello world')</script>"
            windowSpy.mockImplementation(() => ({
                location: {
                    search: `?maliciousQuery=${maliciousCode}`,
                },
            }))
            expect(getQueryParameter("maliciousQuery")).toStrictEqual(
                "&amp;lt;script&amp;gt;alert(&amp;#39;Hello world&amp;#39;)&amp;lt;/script&amp;gt;"
            )
        })
    })
})
