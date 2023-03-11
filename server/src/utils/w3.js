import Web3 from 'web3';

let web3Instance = null;

const getWeb3Instance = () => {
    if (!web3Instance) {
        const network = process.env.NETWORK;
        if (network === "goerli" || network === "mainnet") {
            web3Instance = new Web3 (
                new Web3.providers.HttpProvider (
                    `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`
                )
            );
        } else {
            // Polygon
            web3Instance = new Web3 (
                new Web3.providers.HttpProvider(process.env.POLYGON_HTTP_PROVIDER)
            );
        }
    }

    return web3Instance;
}

// const createWallet = () => {
//     const web3 = getWeb3Instance();
//     return web3.eth.accounts.create(web3.utils.randomHex(32));
// }

export {
    getWeb3Instance,
    // createWallet,
};