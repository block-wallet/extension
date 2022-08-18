export default function mockIndexedDB() {
    require('fake-indexeddb/auto');

    // Need to declare it on global due to js-dom window injection
    if (typeof window !== 'undefined') {
        global.indexedDB = window.indexedDB;
        global.IDBCursor = window.IDBCursor;
        global.IDBCursorWithValue = window.IDBCursorWithValue;
        global.IDBDatabase = window.IDBDatabase;
        global.IDBFactory = window.IDBFactory;
        global.IDBIndex = window.IDBIndex;
        global.IDBKeyRange = window.IDBKeyRange;
        global.IDBObjectStore = window.IDBObjectStore;
        global.IDBOpenDBRequest = window.IDBOpenDBRequest;
        global.IDBRequest = window.IDBRequest;
        global.IDBTransaction = window.IDBTransaction;
        global.IDBVersionChangeEvent = window.IDBVersionChangeEvent;
    }
}
