import sinon from 'sinon';

const mockHex = '0xabcdef0123456789';
const mockKey = Buffer.alloc(32);
let cacheVal: any;

export default {
    encrypt: sinon.stub().callsFake(function (_password, dataObj) {
        cacheVal = dataObj;
        return Promise.resolve(mockHex);
    }),

    decrypt(_password: any, _text: any) {
        return Promise.resolve(cacheVal || {});
    },

    encryptWithKey(key: any, dataObj: any) {
        return this.encrypt(key, dataObj);
    },

    decryptWithKey(key: any, text: any) {
        return this.decrypt(key, text);
    },

    keyFromPassword(_password: any) {
        return Promise.resolve(mockKey);
    },

    generateSalt() {
        return 'WHADDASALT!';
    },
};
