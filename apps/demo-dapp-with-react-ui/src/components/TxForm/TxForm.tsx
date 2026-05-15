import { useCallback, useState } from 'react';
import { beginCell } from '@ton/ton';
import ReactJson, { InteractionProps } from 'react-json-view';
import './style.scss';
import { SendTransactionRequest, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { TonProofDemoApi } from '../../TonProofDemoApi';
import { CHAIN } from '@tonconnect/ui-react';

// In this example, we are using a predefined smart contract state initialization (`stateInit`)
// to interact with an "EchoContract". This contract is designed to send the value back to the sender,
// serving as a testing tool to prevent users from accidentally spending money.

const defaultBody = beginCell().storeUint(0, 32).storeStringTail('Hello!').endCell();

const defaultTx: SendTransactionRequest = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
        {
            address: 'EQCKWpx7cNMpvmcN5ObM5lLUZHZRFKqYA4xmw9jOry0ZsF9M',
            amount: '5000000',
            // (optional) Body in boc base64 format.
            payload: defaultBody.toBoc().toString('base64'),
            // (optional) State init in boc base64 format.
            stateInit:
                'te6cckEBBAEAOgACATQCAQAAART/APSkE/S88sgLAwBI0wHQ0wMBcbCRW+D6QDBwgBDIywVYzxYh+gLLagHPFsmAQPsAlxCarA=='
        }
    ]
};

const defaultTxWithMessages: SendTransactionRequest = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    items: [
        {
            type: 'ton',
            address: 'EQCKWpx7cNMpvmcN5ObM5lLUZHZRFKqYA4xmw9jOry0ZsF9M',
            amount: '5000000',
            // (optional) Body in boc base64 format.
            payload: defaultBody.toBoc().toString('base64'),
            // (optional) State init in boc base64 format.
            stateInit:
                'te6cckEBBAEAOgACATQCAQAAART/APSkE/S88sgLAwBI0wHQ0wMBcbCRW+D6QDBwgBDIywVYzxYh+gLLagHPFsmAQPsAlxCarA=='
        },
        {
            type: 'jetton',
            master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
            amount: '50000',
            destination: 'EQCKWpx7cNMpvmcN5ObM5lLUZHZRFKqYA4xmw9jOry0ZsF9M'
        }
    ]
};

// When `enableEmbeddedRequest: true` returns `hasResponse: false`, the connect happened but no
// signed result came back. The dApp must NOT auto-retry: with `dispatched: true` the wallet may
// already have processed the request and submitting it again will duplicate it. Surface a button
// the user can press deliberately, with stronger wording in the dangerous case.
type RetryPrompt =
    | { kind: 'sendTx'; dispatched: boolean }
    | { kind: 'signMessage'; dispatched: boolean };

export function TxForm() {
    const [tx, setTx] = useState(defaultTx);
    const [waitForTx, setWaitForTx] = useState(false);
    const [txResult, setTxResult] = useState<object | null>(null);
    const [loading, setLoading] = useState(false);
    const [waitingTx, setWaitingTx] = useState(false);
    const [signLoading, setSignLoading] = useState(false);
    const [signResult, setSignResult] = useState<object | null>(null);
    const [retryPrompt, setRetryPrompt] = useState<RetryPrompt | null>(null);

    const wallet = useTonWallet();
    const [tonConnectUi] = useTonConnectUI();

    const onChange = useCallback((value: InteractionProps) => {
        setTx(value.updated_src as SendTransactionRequest);
    }, []);

    const buildNftItemsPayload = (): SendTransactionRequest => {
        const newOwner =
            wallet?.account?.address ?? 'TODO: connect a wallet to fill the new owner address';
        return {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            items: [
                {
                    type: 'nft',
                    nftAddress: 'TODO: paste NFT item contract address',
                    newOwner
                }
            ]
        };
    };

    const handleSendTx = async () => {
        setTxResult(null);
        setRetryPrompt(null);
        setLoading(true);
        setWaitingTx(false);
        try {
            // Always opt into the embedded-request flow: when the wallet is not connected, the
            // SDK opens the connect modal with the request folded into the connect URL; when
            // it is connected, the SDK runs the normal bridge flow and wraps the result in the
            // same `{ hasResponse: true, response }` envelope.
            const embedded = await tonConnectUi.sendTransaction(tx, {
                enableEmbeddedRequest: true
            });
            if (!embedded.hasResponse) {
                // The wallet connected but didn't return a signed transaction. Never retry inline
                // — show the user a button instead (see the warning block below). When
                // `dispatched: true`, the request was already delivered to the wallet via the
                // connect URL, so before re-prompting, the dApp can also poll on-chain for the
                // expected transfer (e.g. with the same `TonProofDemoApi.waitForTransaction`-style
                // logic used by the "Wait for transaction confirmation" toggle below) to detect
                // whether the wallet already processed the request and avoid a double send.
                setRetryPrompt({
                    kind: 'sendTx',
                    dispatched: embedded.connectResult.dispatched
                });
                return;
            }
            const transaction = embedded.response;
            console.debug('Success tonConnectUi.sendTransaction', transaction);
            if (waitForTx && wallet && wallet.account) {
                setWaitingTx(true);
                const network = wallet.account.chain === CHAIN.TESTNET ? 'testnet' : 'mainnet';
                const result = await TonProofDemoApi.waitForTransaction(transaction.boc, network);
                setTxResult(result);
                setWaitingTx(false);
            }
        } catch (err) {
            console.error('Error tonConnectUi.sendTransaction', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSignMessage = async () => {
        setSignResult(null);
        setRetryPrompt(null);
        setSignLoading(true);
        try {
            const embedded = await tonConnectUi.signMessage(tx, {
                enableEmbeddedRequest: true
            });
            if (!embedded.hasResponse) {
                // Same caveat as sendTransaction: do not retry silently when `dispatched: true`.
                // Consider an on-chain check (using your dApp's existing transaction lookup) to
                // detect whether the wallet already processed the request before re-prompting.
                setRetryPrompt({
                    kind: 'signMessage',
                    dispatched: embedded.connectResult.dispatched
                });
                return;
            }
            setSignResult(embedded.response);
            console.debug('Success tonConnectUi.signMessage', embedded.response);
        } catch (error) {
            console.error('Error tonConnectUi.signMessage', error);
        } finally {
            setSignLoading(false);
        }
    };

    return (
        <div className="send-tx-form">
            <h3>Configure and send transaction</h3>
            <button onClick={() => setTx(defaultTx)}>Set message payload</button>
            <button onClick={() => setTx(defaultTxWithMessages)}>Set items payload</button>
            <button onClick={() => setTx(buildNftItemsPayload())}>Set NFT items payload</button>

            <ReactJson
                theme="ocean"
                src={tx}
                onEdit={onChange}
                onAdd={onChange}
                onDelete={onChange}
            />

            <label
                style={{ margin: '12px 0 0 2px', color: '#b8d4f1', fontWeight: 500, fontSize: 15 }}
            >
                <input
                    type="checkbox"
                    checked={waitForTx}
                    onChange={e => setWaitForTx(e.target.checked)}
                    style={{ marginRight: 8 }}
                />
                Wait for transaction confirmation
            </label>

            {waitForTx && (
                <div style={{ margin: '8px 0 0 2px', color: '#b8d4f1', fontSize: 15 }}>
                    {waitingTx ? (
                        <>
                            <span style={{ marginRight: 8 }}>
                                Waiting for transaction confirmation...
                            </span>
                            <span
                                className="loader"
                                style={{
                                    display: 'inline-block',
                                    width: 18,
                                    height: 18,
                                    border: '3px solid #66aaee',
                                    borderTop: '3px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    verticalAlign: 'middle'
                                }}
                            ></span>
                        </>
                    ) : (
                        <span>The transaction will be automatically found and shown below</span>
                    )}
                </div>
            )}

            <button onClick={handleSendTx} disabled={loading || waitingTx || Boolean(retryPrompt)}>
                {loading ? 'Sending...' : 'Send transaction'}
            </button>
            <button onClick={handleSignMessage} disabled={signLoading || Boolean(retryPrompt)}>
                {signLoading ? 'Signing...' : 'Sign message'}
            </button>

            {retryPrompt && (
                <div
                    style={{
                        margin: '12px 0',
                        padding: 12,
                        borderRadius: 8,
                        background: retryPrompt.dispatched ? '#5a2424' : '#1f3a52',
                        color: '#f0f6fb',
                        border: `1px solid ${retryPrompt.dispatched ? '#c14a4a' : '#3a6a90'}`,
                        fontSize: 14,
                        lineHeight: 1.45
                    }}
                >
                    <strong>
                        {retryPrompt.dispatched ? '⚠️ Possible duplicate' : 'Request not delivered'}
                    </strong>
                    <p style={{ margin: '6px 0 10px' }}>
                        {retryPrompt.dispatched ? (
                            <>
                                The {retryPrompt.kind === 'sendTx' ? 'transaction' : 'message'} was
                                delivered to the wallet inside the connect URL, but no response came
                                back. The wallet may have already processed it. Check your wallet
                                history (or the destination address on-chain) before retrying — a
                                blind retry can result in a duplicate transaction.
                            </>
                        ) : (
                            <>
                                The wallet connected but did not receive the request. It is safe to
                                send it again over the bridge.
                            </>
                        )}
                    </p>
                    <button
                        onClick={retryPrompt.kind === 'sendTx' ? handleSendTx : handleSignMessage}
                    >
                        Retry {retryPrompt.kind === 'sendTx' ? 'transaction' : 'message signing'}
                    </button>
                    <button
                        onClick={() => setRetryPrompt(null)}
                        style={{ marginLeft: 8, background: 'transparent' }}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {txResult && (
                <>
                    <div className="find-transaction-demo__json-label">Transaction</div>
                    <div className="find-transaction-demo__json-view">
                        <ReactJson src={txResult} name={false} theme="ocean" collapsed={false} />
                    </div>
                </>
            )}

            {signResult && (
                <>
                    <div className="find-transaction-demo__json-label">Sign Message Result</div>
                    <div className="find-transaction-demo__json-view">
                        <ReactJson src={signResult} name={false} theme="ocean" collapsed={false} />
                    </div>
                </>
            )}

            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
