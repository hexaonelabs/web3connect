import { Wallet, utils, providers } from 'ethers';
import { CHAIN_AVAILABLES, CHAIN_DEFAULT } from '../constant';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { IWalletProvider } from '../interfaces/walllet-provider.interface';
import { Web3Wallet } from './web3-wallet';
// import cryptoRandomString from 'crypto-random-string';

// const generatePrivateKey = () => {
// 	// Générer une clé privée aléatoire de 32 octets
// 	return cryptoRandomString({ length: 64, type: 'hex' });
// };

// Generate a DID from an Ethereum address
const generateDID = (address: string) => {
	return `did:ethr:${address}`;
};

class EVMWallet extends Web3Wallet {
	public did!: string;
	public chainId: number;

	constructor(mnemonic: string, provider: providers.JsonRpcProvider) {
		super(mnemonic);
		if (!this._mnemonic) {
			throw new Error('Mnemonic is required to generate wallet');
		}
		const wallet = Wallet.fromMnemonic(this._mnemonic);
		this.address = wallet.address;
		this.publicKey = wallet.publicKey;
		this.privateKey = wallet.privateKey;
		this.did = generateDID(this.address);
		this.provider = provider;
		this.chainId = provider.network.chainId;
	}

	sendTransaction(
		tx: utils.Deferrable<providers.TransactionRequest>
	): Promise<providers.TransactionResponse> {
		if (!this.privateKey) {
			throw new Error('Private key is required to send transaction');
		}
		const wallet = new Wallet(this.privateKey, this.provider);
		return wallet.sendTransaction(tx);
	}

	signMessage(message: string): Promise<string> {
		if (!this.privateKey) {
			throw new Error('Private key is required to sign message');
		}
		const wallet = new Wallet(this.privateKey, this.provider);
		return wallet.signMessage(message);
	}

	signTransaction(message: providers.TransactionRequest): Promise<string> {
		if (!this.privateKey) {
			throw new Error('Private key is required to sign transaction');
		}
		const wallet = new Wallet(this.privateKey, this.provider);
		return wallet.signTransaction(message);
	}

	verifySignature(message: string, signature: string): boolean {
		if (!this.publicKey) {
			throw new Error('Public key is required to verify signature');
		}
		return utils.verifyMessage(message, signature) === this.address;
	}

	async switchNetwork(chainId: number): Promise<void> {
		if (this.chainId === chainId) {
			return;
		}
		const chain = CHAIN_AVAILABLES.find(c => c.id === chainId);
		if (!chain) {
			throw new Error('Chain not available');
		}
		if (!this.provider) {
			throw new Error('Provider not available');
		}
		const chainIdAsHex = utils.hexValue(chainId);
		await this.provider.send('wallet_switchEthereumChain', [
			{ chainId: chainIdAsHex }
		]);
	}
}

const generateWalletFromMnemonic = async (
	ops: {
		mnemonic?: string;
		chainId?: number;
	} = {}
) => {
	const { mnemonic = generateMnemonic(), chainId } = ops;
	// validate mnemonic
	if (!validateMnemonic(mnemonic)) {
		throw new Error('Invalid mnemonic');
	}
	const chain = CHAIN_AVAILABLES.find(c => c.id === chainId) || CHAIN_DEFAULT;
	const provider = new providers.JsonRpcProvider(chain.rpcUrl, chain.id);
	const web3Wallet = new EVMWallet(mnemonic, provider);
	return web3Wallet;
};

// const generateWalletFromPrivateKey = async (
// 	privateKey: string,
// 	chainId?: number
// ): Promise<Web3Wallet> => {
// 	if (!utils.isHexString(privateKey)) {
// 		throw new Error('Invalid private key');
// 	}

// 	const chain = CHAIN_AVAILABLES.find(c => c.id === chainId) || CHAIN_DEFAULT;
// 	const provider = new providers.JsonRpcProvider(chain.rpcUrl, chain.id);
// 	const wallet = new EVMWallet(privateKey, provider);
// 	return wallet;
// 	// const ethrDid = generateDID(wallet.address);
// 	// return {
// 	// 	privateKey: wallet.privateKey,
// 	// 	publicKey: wallet.publicKey,
// 	// 	address: wallet.address,
// 	// 	provider
// 	// };
// };

interface WindowWithEthereumProvider extends Window {
	ethereum: providers.ExternalProvider;
}

const connectWithExternalWallet = async (): Promise<Web3Wallet> => {
	// check if metamask/browser extension is installed
	if (!(window as unknown as WindowWithEthereumProvider).ethereum) {
		throw new Error(`
      No web3 wallet extension found. 
      Install browser extensions like Metamask or Rabby wallet to connect with the app using your existing or hardware wallet.
    `);
	}
	// get current account
	const web3Provider = new providers.Web3Provider(
		(window as unknown as WindowWithEthereumProvider).ethereum
	);
	const accounts = await web3Provider.send('eth_requestAccounts', []);
	console.log(`[INFO] connectWithExternalWallet: `, accounts);
	// set to default chain
	try {
		const chainIdAsHex = utils.hexValue(CHAIN_DEFAULT.id);
		await web3Provider.send('wallet_switchEthereumChain', [
			{ chainId: chainIdAsHex }
		]);
	} catch (error: unknown) {
		console.log('[ERROR]', error);
	}
	const signer = web3Provider?.getSigner();
	const address = await signer.getAddress();
	const chainId = await signer.getChainId();
	console.log('[INFO] connectWithExternalWallet', {
		accounts,
		address,
		chainId
	});

	// return object fromated as Web3Wallet
	return {
		privateKey: undefined,
		publicKey: undefined,
		mnemonic: undefined,
		address,
		chainId,
		provider: web3Provider,
		switchNetwork: async (chainId: number): Promise<void> => {
			const chain = CHAIN_AVAILABLES.find(c => c.id === chainId);
			if (!chain) {
				throw new Error('Chain not available');
			}
			if (chain.type !== 'evm') {
				throw new Error('Only EVM chain is supported with external wallet.');
			}
			const chainIdAsHex = utils.hexValue(chainId);
			await web3Provider.send('wallet_switchEthereumChain', [
				{ chainId: chainIdAsHex }
			]);
		},
		sendTransaction: async (
			tx: utils.Deferrable<providers.TransactionRequest>
		) => {
			return signer.sendTransaction(tx);
		},
		signMessage(message) {
			return signer.signMessage(message);
		},
		signTransaction(tx: utils.Deferrable<providers.TransactionRequest>) {
			return signer.signTransaction(tx);
		},
		verifySignature(message, signature) {
			return utils.verifyMessage(message, signature) === address;
		}
	};
};

const evmWallet: Readonly<
	IWalletProvider<{ mnemonic?: string; chainId?: number }>
> = Object.freeze({
	connectWithExternalWallet,
	generateWalletFromMnemonic,
	generateDID
});

export default evmWallet;
