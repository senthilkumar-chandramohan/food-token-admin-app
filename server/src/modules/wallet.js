import ethers from "ethers";
import crypto from "crypto";
import dotenv from "dotenv";
import { splitSignature } from "ethers/lib/utils.js";
import { EXTERNAL_ACCOUNT_ID_WALLET_MAP, CONTRACT_ADDRESS, CONTRACT_ABI, DECIMALS } from "../utils/constants.js";
import { getWeb3Instance } from "../utils/w3.js";

dotenv.config();

const getBigNumber = (number) => {
  const web3 = getWeb3Instance();
  return web3.utils.toBN(number);
}

const _storeWalletInVault = (externalAccountId, wallet) => {
    EXTERNAL_ACCOUNT_ID_WALLET_MAP[externalAccountId] = wallet;
    console.log(EXTERNAL_ACCOUNT_ID_WALLET_MAP);
};

const _getWalletFromVault = (externalAccountId) => {
  return EXTERNAL_ACCOUNT_ID_WALLET_MAP[externalAccountId];
}

const createWallet = () => {
    const id = crypto.randomBytes(32).toString('hex');
    const privateKey = "0x" + id;

    const wallet = new ethers.Wallet(privateKey);
    return { privateKey, wallet };
};

const createAccountProfile = async (externalAccountId) => {
    const { privateKey, wallet } = createWallet();
    const {
        address,
    } = wallet;

    console.log("wallet", wallet);

    _storeWalletInVault(externalAccountId, { privateKey, address });
    _provideTransferPermissionToSystemAccount(wallet);
    return wallet;
};

const _provideTransferPermissionToSystemAccount = async (wallet) => {
  const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);
  const ownerAddress = wallet.address;
    const spenderAddress = signer.address;
    const value = ethers.constants.MaxUint256; // Unlimited balance
    const nonce = 0; // Setting to 0 since Permit is executed only once for a wallet
    const deadline = ethers.constants.MaxUint256; // Unlimited timeframe

    const web3 = getWeb3Instance("POLYGON");

    console.log("web3 instance created");

    const abi = CONTRACT_ABI;
    const chainId = process.env.CHAIN_ID;
    const name = "FoodToken";
    const version = "1";

    const permitConfig = {
        nonce,
        name,
        version,
        chainId,
    };

    const contractAddress = CONTRACT_ADDRESS;
    const permitSignature = await getPermitSignature(wallet, spenderAddress, value, deadline, contractAddress, permitConfig);

    const { v, r, s } = permitSignature;

    // Call Permit method in contract
    const contract = new web3.eth.Contract(
        abi,
        contractAddress,
    );

    const txn = contract.methods.permit(ownerAddress, spenderAddress, value, deadline, v, r, s);
    const gas = await txn.estimateGas({ from: signer.address });
    const gasPrice = await web3.eth.getGasPrice();
    const data = txn.encodeABI();
    const accountNonce = await web3.eth.getTransactionCount(signer.address);

    const signedTxn = await web3.eth.accounts.signTransaction({
        to: contract.options.address,
        data,
        gas,
        gasPrice,
        nonce: accountNonce,
        chainId,
    }, process.env.SIGNER_PRIVATE_KEY);

    const receipt = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction);
    console.log(receipt);
    return wallet;
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
  
    return splitSignature (
      await wallet._signTypedData(
        {
          name,
          version,
          chainId,
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
    );
  }

const mintTokens = async (externalAccountId, amount) => {
  try {
//    const wallet = _getWalletFromVault(externalAccountId);
    const wallet = {
      privateKey: '0x29577a4faeaf05421b93fdb882d3162c9ded82e8b24be4cd46823a05fee17f57',
      address: '0xEEEDab9cAc42Ad100dBed36A1467ae545F83C6Fc'
    };

    const {
      address,
    } = wallet;

    const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);
    const web3 = getWeb3Instance("POLYGON");

    const chainId = process.env.CHAIN_ID;
    // Call Permit method in contract
    const contract = new web3.eth.Contract (
      CONTRACT_ABI,
      CONTRACT_ADDRESS,
    );

    const amountBN = getBigNumber(amount).mul(getBigNumber(DECIMALS));
    const txn = contract.methods.mint(address, amountBN);
    const gas = await txn.estimateGas({ from: signer.address });
    const gasPrice = await web3.eth.getGasPrice();
    const data = txn.encodeABI();
    const nonce = await web3.eth.getTransactionCount(signer.address);

    const signedTxn = await web3.eth.accounts.signTransaction({
        to: contract.options.address,
        data,
        gas,
        gasPrice,
        nonce,
        chainId,
    }, process.env.SIGNER_PRIVATE_KEY);

    const receipt = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction);
    console.log(receipt);
    
    return {
      status: true,
      message: "SUCCESS",
    };
  } catch (err) {
    return {
      status: false,
      message: err.message,
    };
  }
}

export {
    createAccountProfile,
    mintTokens,
};
