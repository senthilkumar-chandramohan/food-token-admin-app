import ethers from 'ethers';
import { SYSTEM_ACCOUNT, SYSTEM_ACCOUNT_PRIVATE_KEY, USER_ACCOUNT_DETAILS_MAP, CONTRACT_JSON } from "../utils/constants.js";
import { getWeb3Instance, createCryptoAccount } from "../utils/w3.js";

const _storeAccountInVault = (accountId, address, privateKey) => {
    USER_ACCOUNT_DETAILS_MAP[accountId] = {
        address,
        privateKey,
    };
};

const createAccountProfile = (accountId) => {
    const account = createCryptoAccount();
    const {
        address,
        privateKey,
    } = account;

    _storeAccountInVault(accountId, address, privateKey);
    _provideTransferPermissionToSystemAccount(account);
    return account;
};

const _provideTransferPermissionToSystemAccount = async (account) => {
    const owner = account.address;
    const spender = SYSTEM_ACCOUNT;
    const value = ethers.constants.MaxUint256; // Unlimited balance
    const nonce = 0; // Since Permit is executed only once for a wallet
    const deadline = ethers.constants.MaxUint256; // Unlimited timeframe

    const web3 = getWeb3Instance();
    const networkId = await web3.eth.net.getId();
    const {
        contractName,
        abi,
        networks,
        devdoc: {
            version,
        },
    } = CONTRACT_JSON;

    const contractAddress = networks[networkId].address;
    const permit = await _createPermit(
        spender,
        value,
        nonce,
        deadline,
        account, 
        {
            networkId,
            domainName: contractName,
            domainVersion: version,
            contractAddress,
        }
    );

    // console.log(permit);
    const { v, r, s } = permit;

    // Call Permit method in contract
    const contract = new web3.eth.Contract(
        abi,
        contractAddress,
    );

    const txn = contract.methods.permit(owner, spender, value, deadline, v, r, s);
    // TODO: update contract to accept sender const txn = contract.methods.sendCoin(sender, receiver, amount);
    const gas = await txn.estimateGas({ from: SYSTEM_ACCOUNT });
    const gasPrice = await web3.eth.getGasPrice();
    const data = txn.encodeABI();
    const accountNonce = await web3.eth.getTransactionCount(SYSTEM_ACCOUNT);

    console.log('\n gas:', gas);
    console.log('\n gasPrice:', gasPrice);
    console.log('\n nonce:', accountNonce);

    const signedTxn = await web3.eth.accounts.signTransaction({
        to: contract.options.address,
        data,
        gas,
        gasPrice,
        nonce: accountNonce,
        chainId: networkId,
    }, SYSTEM_ACCOUNT_PRIVATE_KEY);

    const receipt = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction);
    return receipt;
};

const _createPermit = async (spender, value, nonce, deadline, account, { networkId, domainName, domainVersion, contractAddress }) => {
    const {
        address,
        privateKey,
        sign,
    } = account;

    const permit = { owner: address, spender, value, nonce, deadline }
    const Permit = [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ];

    const domain = {
      name: domainName,
      version: domainVersion,
      verifyingContract: contractAddress,
      chainId: networkId,
    };

    const domainType = [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ];

    const dataToSign = JSON.stringify({
        types: {
            EIP712Domain: domainType,
            Permit: Permit
        },
        domain: domain,
        primaryType: "Permit",
        message: permit
    });

    return sign(dataToSign, privateKey);
};


export {
    createAccountProfile,
};
