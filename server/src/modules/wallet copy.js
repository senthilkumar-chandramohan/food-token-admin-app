import ethers from 'ethers';
import crypto from 'crypto';
import { splitSignature } from 'ethers/lib/utils.js';
import { SYSTEM_ACCOUNT, SYSTEM_ACCOUNT_PRIVATE_KEY, EXTERNAL_ACCOUNT_ID_WALLET_MAP, CONTRACT_JSON } from "../utils/constants.js";
import { getWeb3Instance } from "../utils/w3.js";

const _storeWalletInVault = (externalAccountId, wallet) => {
    EXTERNAL_ACCOUNT_ID_WALLET_MAP[externalAccountId] = wallet;
    console.log(EXTERNAL_ACCOUNT_ID_WALLET_MAP);
};

const createWallet = () => {
    const id = crypto.randomBytes(32).toString('hex');
    const privateKey = "0x" + id;

    const wallet = new ethers.Wallet(privateKey);
    return { privateKey, wallet };
};

const createAccountProfile = (externalAccountId) => {
    const { privateKey, wallet } = createWallet();
    const {
        address,
    } = wallet;

    _storeWalletInVault(externalAccountId, { privateKey, address });
    _provideTransferPermissionToSystemAccount(wallet);
    return wallet;
};

const _provideTransferPermissionToSystemAccount = async (wallet) => {
    const owner = wallet.address;
    const spender = SYSTEM_ACCOUNT;
    const value = ethers.constants.MaxUint256; // Unlimited balance
    const nonce = 0; // Since Permit is executed only once for a wallet
    const deadline = ethers.constants.MaxUint256; // Unlimited timeframe

    const web3 = getWeb3Instance();
    const networkId = await web3.eth.net.getId();
    const {
        contractName: name,
        abi,
        networks,
        devdoc: {
            version,
        },
    } = CONTRACT_JSON;

    const permitConfig = {
        nonce,
        name,
        version,
        chainId: networkId,
    };

    const contractAddress = networks[networkId].address;
    const permitSignature = await getPermitSignature(wallet, spender, value, deadline, contractAddress, permitConfig);
    console.log(permitSignature);

    const { v, r, s } = permitSignature;

    // Call Permit method in contract
    const contract = new web3.eth.Contract(
        abi,
        contractAddress,
    );
    const txn = contract.methods.permit(owner, spender, value, deadline, v, r, s);
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
        chainId: 1377,
    }, SYSTEM_ACCOUNT_PRIVATE_KEY);

    const receipt = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction);
    return receipt;
}

const getPermitSignature = async (
    wallet,
    spender,
    value,
    deadline,
    contractAddress,
    permitConfig,
  ) => {
    const {
        nonce,
        name,
        version,
        chainId
    } = permitConfig;

    console.log('permitConfig', permitConfig);
  
    return splitSignature(
      await wallet._signTypedData(
        {
          name,
          version: 1,
          chainId: 1377,
          verifyingContract: contractAddress,
        },
        {
          Permit: [
            {
              name: 'owner',
              type: 'address',
            },
            {
              name: 'spender',
              type: 'address',
            },
            {
              name: 'value',
              type: 'uint256',
            },
            {
              name: 'nonce',
              type: 'uint256',
            },
            {
              name: 'deadline',
              type: 'uint256',
            },
          ],
        },
        {
          owner: wallet.address,
          spender,
          value,
          nonce,
          deadline,
        }
      )
    )
  }
/*
const _provideTransferPermissionToSystemAccount = async (account) => {
    const owner = account.address;
    const spender = SYSTEM_ACCOUNT;
    const value = 1000 //ethers.constants.MaxUint256; // Unlimited balance
    const nonce = 0; // Since Permit is executed only once for a wallet
    const deadline = 1676484604 // ethers.constants.MaxUint256; // Unlimited timeframe

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

    console.log(permit);
    const { v, r, s } = permit;

    // Call Permit method in contract
    const contract = new web3.eth.Contract(
        abi,
        contractAddress,
    );

    console.log("---------------------------------------------------------");
    console.log(owner, spender, value, deadline);
    console.log("---------------------------------------------------------");

    const txn = contract.methods.permit(owner, spender, value, deadline, v, r, s);
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

const _signTyped = (account, dataToSign) => {
    const web3 = getWeb3Instance();
//    console.log(web3.eth);

    // call this method to sign EIP 712 data
    return new Promise((resolve, reject) => {
      web3.eth.sign(dataToSign, account.address, (err, result) => {
        console.log(result);
        console.log("99999999999999999999999999999999999999999999999999");
        if (err) return reject(err);
        resolve(result.result)
      })
    })
  }

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

//    _signTyped(account, dataToSign);

    return sign(dataToSign, privateKey);
};
*/
export {
    createAccountProfile,
};
