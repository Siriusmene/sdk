import { createMemo, createSignal } from 'solid-js';
import { WalletInfoWithOpenMethod, WalletOpenMethod } from 'src/models/connected-wallet';
import { LastSelectedWalletInfoStorage } from 'src/storage';
import { ReturnStrategy } from 'src/models';
import { WalletsModalState } from 'src/models/wallets-modal';
import { SingleWalletModalState } from 'src/models/single-wallet-modal';
import { UIWalletInfo } from 'src/app/models/ui-wallet-info';

export const actionKindSendTransaction = 'sendTransaction' as const;
export type ActionKindSendTransaction = typeof actionKindSendTransaction;
export const actionKindSignData = 'signData' as const;
export type ActionKindSignData = typeof actionKindSignData;
export const actionKindSignMessage = 'signMessage' as const;
export type ActionKindSignMessage = typeof actionKindSignMessage;

export type ActionKind = ActionKindSendTransaction | ActionKindSignData | ActionKindSignMessage;

export const confirmActionNames = {
    [actionKindSendTransaction]: 'confirm-transaction',
    [actionKindSignData]: 'confirm-sign-data',
    [actionKindSignMessage]: 'confirm-sign-message'
} as const satisfies Record<ActionKind, string>;

export const successActionNames = {
    [actionKindSendTransaction]: 'transaction-sent',
    [actionKindSignData]: 'data-signed',
    [actionKindSignMessage]: 'message-signed'
} as const satisfies Record<ActionKind, string>;

export const errorActionNames = {
    [actionKindSendTransaction]: 'transaction-canceled',
    [actionKindSignData]: 'sign-data-canceled',
    [actionKindSignMessage]: 'sign-message-canceled'
} as const satisfies Record<ActionKind, string>;

export type ConfirmActionName = (typeof confirmActionNames)[ActionKind];
export type SuccessActionName = (typeof successActionNames)[ActionKind];
export type ErrorActionName = (typeof errorActionNames)[ActionKind];

type BaseAction = {
    openModal: boolean;
    showNotification: boolean;
    sessionId?: string;
    traceId: string;
};

type ActionByKind<
    Names extends Record<ActionKind, string>,
    TAction extends ActionKind
> = TAction extends ActionKind ? BaseAction & { name: Names[TAction] } : never;

export type ConfirmAction<TAction extends ActionKind = ActionKind> = {
    returnStrategy?: ReturnStrategy;
    twaReturnUrl?: `${string}://${string}`;
    executed?: boolean;
} & ActionByKind<typeof confirmActionNames, TAction>;

export type SuccessAction<TAction extends ActionKind = ActionKind> = ActionByKind<
    typeof successActionNames,
    TAction
>;

export type ErrorAction<TAction extends ActionKind = ActionKind> = ActionByKind<
    typeof errorActionNames,
    TAction
>;

export type Action = ConfirmAction | SuccessAction | ErrorAction;

const confirmActionNameSet = new Set<string>(Object.values(confirmActionNames));
const successActionNameSet = new Set<string>(Object.values(successActionNames));
const errorActionNameSet = new Set<string>(Object.values(errorActionNames));

export function isConfirmAction(action: Action): action is ConfirmAction {
    return confirmActionNameSet.has(action.name);
}

export function isSuccessAction(action: Action): action is SuccessAction {
    return successActionNameSet.has(action.name);
}

export function isErrorAction(action: Action): action is ErrorAction {
    return errorActionNameSet.has(action.name);
}

export const [walletsModalState, setWalletsModalState] = createSignal<WalletsModalState>({
    status: 'closed',
    closeReason: null
});

export const getWalletsModalIsOpened = createMemo(() => walletsModalState().status === 'opened');

export const [singleWalletModalState, setSingleWalletModalState] =
    createSignal<SingleWalletModalState>({
        status: 'closed',
        closeReason: null
    });

export const getSingleWalletModalIsOpened = createMemo(
    () => singleWalletModalState().status === 'opened'
);

export const getSingleWalletModalWalletInfo = createMemo(() => {
    const state = singleWalletModalState();
    if (state.status === 'opened') {
        return state.walletInfo;
    }

    return null;
});

let lastSelectedWalletInfoStorage =
    typeof window !== 'undefined' ? new LastSelectedWalletInfoStorage() : undefined;
export const [lastSelectedWalletInfo, _setLastSelectedWalletInfo] = createSignal<
    | WalletInfoWithOpenMethod
    | {
          openMethod: WalletOpenMethod;
      }
    | null
>(lastSelectedWalletInfoStorage?.getLastSelectedWalletInfo() || null);

export const setLastSelectedWalletInfo = (
    walletInfo:
        | WalletInfoWithOpenMethod
        | {
              openMethod: WalletOpenMethod;
          }
        | null
): void => {
    if (!lastSelectedWalletInfoStorage) {
        lastSelectedWalletInfoStorage = new LastSelectedWalletInfoStorage();
    }

    if (walletInfo) {
        lastSelectedWalletInfoStorage.setLastSelectedWalletInfo(walletInfo);
    } else {
        lastSelectedWalletInfoStorage.removeLastSelectedWalletInfo();
    }
    _setLastSelectedWalletInfo(walletInfo);
};

export const [action, setAction] = createSignal<Action | null>(null);
export const [lastVisibleWalletsInfo, setLastVisibleWalletsInfo] = createSignal<{
    walletsMenu: 'explicit_wallet' | 'main_screen' | 'other_wallets';
    wallets: UIWalletInfo[];
}>({
    walletsMenu: 'explicit_wallet',
    wallets: []
});
export const [lastOpenedLink, setLastOpenedLink] = createSignal<{
    link: string;
    type?: 'tg_link' | 'external_link';
}>({
    link: ''
});
