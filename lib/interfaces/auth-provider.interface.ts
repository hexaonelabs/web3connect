type Unsubscribe = () => void;

type User = { uid: string; isAnonymous: boolean };
type UserCredential = { user: User };

export interface IAuthProvider<T> {
	signinWithGoogle: () => Promise<{ uid: string }>;
	sendLinkToEmail: (email: string) => Promise<void>;
	signInWithLink: () => Promise<UserCredential | undefined>;
	signInAsAnonymous: () => Promise<UserCredential>;
	signOut: () => Promise<void>;
	getOnAuthStateChanged: (cb: (user: User | null) => void) => Unsubscribe;
	getCurrentUserAuth: () => Promise<User | null>;
	initialize: (config: T) => void;
}
