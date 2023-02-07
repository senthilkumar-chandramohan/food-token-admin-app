import ethers from "ethers";
import crypto from "crypto";
import dotenv from "dotenv";
import { splitSignature } from "ethers/lib/utils.js";
import { EXTERNAL_ACCOUNT_ID_WALLET_MAP, CONTRACT_ADDRESS, CONTRACT_ABI } from "../utils/constants.js";
import { getWeb3Instance } from "../utils/w3.js";

dotenv.config();

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

const createAccountProfile = async (externalAccountId) => {
    const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);
    const { privateKey, wallet } = createWallet();
    const {
        address,
    } = wallet;

    _storeWalletInVault(externalAccountId, { privateKey, address });
    _provideTransferPermissionToSystemAccount(wallet, signer);
    return wallet;
};

const _provideTransferPermissionToSystemAccount = async (wallet, signer) => {
    const ownerAddress = wallet.address;
    const spenderAddress = signer.address;
    const value = ethers.constants.MaxUint256; // Unlimited balance
    const nonce = 0; // Since Permit is executed only once for a wallet
    const deadline = ethers.constants.MaxUint256; // Unlimited timeframe

    const web3 = getWeb3Instance();

    const abi = CONTRACT_ABI;
    const chainId = 5 // For Goerli
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

export {
    createAccountProfile,
};
