interface Store {
    [key: string]: any
}

const fakeLocalStorage = (function () {
    let store: Store = {}

    return {
        getItem: function (key: string) {
            return store[key] || null
        },
        setItem: function (key: string, value: any) {
            store[key] = value.toString()
        },
        removeItem: function (key: string) {
            delete store[key]
        },
        clear: function () {
            store = {}
        },
        key: (k: string) => {
            let key = Object.keys(store)[String(k) as any]
            return !key ? null : key
        },
        get length() {
            return Object.keys(store).length
        },
        get store() {
            return store
        },
    }
})()

export default new Proxy(fakeLocalStorage, {
    ownKeys: (target: any) => {
        if (target.store) {
            return Object.keys(target.store)
        }
        return []
    },
    getOwnPropertyDescriptor(k) {
        return {
            enumerable: true,
            configurable: true,
        }
    },
})
