import { providers, getDefaultProvider } from 'ethers';
import authProvider from './providers/auth/firebase';
import storageProvider from './providers/storage/local';
import './ui/dialog-element/dialogElement';
import {
	addAndWaitUIEventsResult,
	setupSigninDialogElement
} from './ui/dialog-element/dialogElement';
import { FirebaseOptions } from 'firebase/app';
import {
	CHAIN_DEFAULT,
	DEFAULT_SIGNIN_METHODS,
	KEYS,
	SigninMethod
} from './constant';
import { IStorageProvider } from './interfaces/storage-provider.interface';
import { parseApiKey } from './utils';
import { initWallet } from './services/wallet.service.ts';

export class HexaConnect {
	private readonly _apiKey!: FirebaseOptions;
	private _ops?: {
		chainId?: number;
		rpcUrl?: string;
		enabledSigninMethods?: SigninMethod[];
		storageService?: IStorageProvider;
	};
	private _secret!: string | undefined;
	private _provider!: providers.JsonRpcProvider | providers.BaseProvider;
	private _publicKey!: string | null;
	private _did!: string | null;
	private _address!: string | null;

	get provider() {
		return this._provider;
	}

	get userInfo() {
		return this._address && this._did
			? {
					address: this._address,
					did: this._did,
					publicKey: this._publicKey
				}
			: null;
	}

	constructor(
		apiKey: string,
		ops?: {
			chainId?: number;
			rpcUrl?: string;
			enabledSigninMethods?: SigninMethod[];
			storageService?: IStorageProvider;
		}
	) {
		this._apiKey = parseApiKey(apiKey.slice(2));
		this._ops = {
			enabledSigninMethods: DEFAULT_SIGNIN_METHODS,
			...ops
		};
		authProvider.initialize(this._apiKey);
		// set storage.uid
		(this._ops?.storageService || storageProvider).initialize();
		// check if window is available and HTMLDialogElement is supported
		if (!window || !window.HTMLDialogElement) {
			throw new Error('[ERROR] HexaConnect: HTMLDialogElement not supported');
		}
		console.log(`[INFO] HexaConnect initialized and ready!`, {
			config: this._ops,
			mode: import.meta.env.MODE
		});
	}

	static isConnectWithLink() {
		// check special paramettre in url `finishSignUp`
		const isSignInWithLink =
			window.location.search.includes('finishSignUp=true');
		if (!isSignInWithLink) {
			return false;
		} else {
			return true;
		}
	}

	static connectWithLink() {
		if (!this.isConnectWithLink()) {
			return undefined;
		}
		return authProvider.signInWithLink();
	}

	public async connectWithUI(isLightMode: boolean = false) {
		// build UI
		const dialogElement = setupSigninDialogElement(document.body, {
			isLightMode,
			enabledSigninMethods: this._ops?.enabledSigninMethods
		});
		// open modal
		dialogElement.showModal();
		try {
			// wait for connect event
			const {
				password,
				isAnonymous = false,
				uid
			} = (await addAndWaitUIEventsResult(dialogElement)) || {};

			console.log(`[INFO] Closing dialog`, { password, isAnonymous, uid });
			// handle close event && anonymous user
			if (!uid || isAnonymous) {
				dialogElement.hideModal();
				// wait 225ms to let the dialog close wth animation
				await new Promise(resolve => setTimeout(resolve, 225));
				// remove dialog element
				dialogElement?.remove();
				return this.userInfo;
			}
			this._secret = password;
			await this.initWallet({
				isAnonymous,
				uid
			});
			// resolve result
			// resolve(this.userInfo);
		} catch (error: unknown) {
			const message =
				(error as Error)?.message || 'An error occured while connecting';
			await dialogElement.toggleSpinnerAsCross(message);
			throw error;
		}
		// close modal with animation and resolve the promise with user info
		dialogElement.hideModal();
		// wait 225ms to let the dialog close wth animation
		await new Promise(resolve => setTimeout(resolve, 225));
		// remove dialog element
		dialogElement?.remove();
		return this.userInfo;
	}

	public async signout() {
		await storageProvider.removeItem(KEYS.STORAGE_SECRET_KEY);
		await authProvider.signOut();
	}

	/**
	 * Method that initialize the wallet base on the user state.
	 */
	public async initWallet(
		user: {
			uid: string;
			isAnonymous: boolean;
		} | null
	) {
		console.log('[INFO] initWallet:', {
			user,
			userInfo: this.userInfo,
			_secret: this._secret
		});
		if (!user) {
			return null;
		}
		if (this.userInfo?.address) {
			return this.userInfo;
		}
		const wallet = await initWallet(
			user,
			this._secret,
			this._ops?.chainId || CHAIN_DEFAULT.id
		);
		if (!wallet) {
			return null;
		}
		const { did, address, provider, publicKey, privateKey } = wallet;
		// set wallet values with the generated wallet
		await this._setValues({ did, address, provider, publicKey, privateKey });
		return this.userInfo;
	}

	/**
	 * Method that manage the entire wallet management process base on user state.
	 * Wallet values are set with the corresponding method base on the user authentication provider.
	 * If no user is connected, all wallet values are set to null with a default provider and the method will return null.
	 *
	 * @param cb Call back function that return the formated user information to the caller.
	 * @returns
	 */
	public onConnectStateChanged(
		cb: (user: { address: string; did: string } | null) => void
	) {
		return authProvider.getOnAuthStateChanged(async user => {
			if (!this.userInfo && user) {
				try {
					await this.initWallet(user);
				} catch (error: unknown) {
					await authProvider.signOut();
					await storageProvider.clear();
					const message =
						(error as Error)?.message || 'An error occured while connecting';
					console.error('[ERROR] onConnectStateChanged:', message);
					//throw error;
				}
			} else {
				this._secret = undefined;
				this._address = null;
				this._did = null;
				this._publicKey = null;
				this._provider = getDefaultProvider();
			}
			console.log('[INFO] onConnectStateChanged:', {
				user,
				userInfo: this.userInfo,
				_secret: this._secret
			});
			cb(user ? this.userInfo : null);
		});
	}

	private async _setValues(values: {
		did: string;
		address: string;
		provider: providers.JsonRpcProvider;
		privateKey?: string;
		publicKey?: string;
	}) {
		const { did, address, provider, publicKey = null } = values;
		this._did = did;
		this._address = address;
		this._provider = provider;
		this._publicKey = publicKey;
	}
}
