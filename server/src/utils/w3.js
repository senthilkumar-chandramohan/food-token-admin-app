import Web3 from 'web3';

let web3Instance = null;

const getWeb3Instance = () => {
    if (!web3Instance) {
        web3Instance = new Web3('http://127.0.0.1:7545'); 
    }

    return web3Instance;
}

const createCryptoAccount = () => {
    const web3 = getWeb3Instance();
    return web3.eth.accounts.create(web3.utils.randomHex(32));
}

export {
    getWeb3Instance,
    createCryptoAccount,
};