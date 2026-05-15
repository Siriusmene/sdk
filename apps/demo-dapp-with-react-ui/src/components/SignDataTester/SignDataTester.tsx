/* eslint-disable no-console */
import './style.scss';
import {
    SignDataPayload,
    SignDataResponse,
    useTonConnectUI,
    useTonWallet
} from '@tonconnect/ui-react';
import { beginCell } from '@ton/ton';
import { useState } from 'react';
import ReactJson from 'react-json-view';
import { TonProofDemoApi } from '../../TonProofDemoApi';

const textPayload = (): SignDataPayload => ({
    type: 'text',
    text: 'I confirm this test signature request.'
});

const binaryPayload = (): SignDataPayload => ({
    type: 'binary',
    bytes: Buffer.from('I confirm this test signature request.', 'ascii').toString('base64')
});

const cellPayload = (): SignDataPayload => {
    const text = 'Test message in cell';
    const cell = beginCell().storeUint(text.length, 7).storeStringTail(text).endCell();
    return {
        type: 'cell',
        schema: 'message#_ len:uint7 {len <= 127} text:(bits len * 8) = Message;',
        cell: cell.toBoc().toString('base64')
    };
};

// When `enableEmbeddedRequest: true` returns `hasResponse: false`, the connect happened but no
// signature came back. The dApp must NOT auto-retry: with `dispatched: true` the wallet may
// already have signed the request and the signature is just lost in transit. Surface a button the
// user can press deliberately and warn loudly in the dangerous case.
type RetryPrompt = { payload: SignDataPayload; label: string; dispatched: boolean };

// Component to test SignData functionality
export function SignDataTester() {
    const wallet = useTonWallet();
    const [tonConnectUi] = useTonConnectUI();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [signDataRequest, setSignDataRequest] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [signDataResponse, setSignDataResponse] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [verificationResult, setVerificationResult] = useState<any>(null);
    const [retryPrompt, setRetryPrompt] = useState<RetryPrompt | null>(null);

    const requestSign = async (payload: SignDataPayload, label: string) => {
        setSignDataRequest(payload);
        setSignDataResponse(null);
        setVerificationResult(null);
        setRetryPrompt(null);
        console.log(`📤 Sign Data Request (${label}):`, payload);

        try {
            // Always opt into the embedded-request flow: the SDK opens the connect modal with the
            // request folded into the URL when not connected, or runs the bridge flow when
            // already connected — and wraps both into the same `{ hasResponse, ... }` envelope.
            const embedded = await tonConnectUi.signData(payload, { enableEmbeddedRequest: true });
            if (!embedded.hasResponse) {
                // Never retry inline — show a button (see JSDoc on signData). When
                // `dispatched: true`, the wallet already received the request via the connect
                // URL and may have already signed it; before re-prompting, the dApp can verify
                // on-chain (or in its own backend logic) that it doesn't already hold a valid
                // signature for this payload to avoid collecting a duplicate.
                setRetryPrompt({
                    payload,
                    label,
                    dispatched: embedded.connectResult.dispatched
                });
                return;
            }
            const result: SignDataResponse = embedded.response;
            setSignDataResponse(result);
            console.log('📥 Sign Data Response:', result);
            if (wallet) {
                const verification = await TonProofDemoApi.checkSignData(result, wallet.account);
                setVerificationResult(verification);
                console.log('✅ Verification Result:', verification);
            }
        } catch (e) {
            console.error(`Error signing ${label}:`, e);
            setSignDataResponse({ error: e instanceof Error ? e.message : 'Unknown error' });
        }
    };

    return (
        <div className="sign-data-tester">
            <h3>Sign Data Test & Verification</h3>

            <div className="sign-data-tester__info">
                Test different types of data signing: text, binary, and cell formats with signature
                verification
            </div>

            <div className="sign-data-tester__buttons">
                <button
                    onClick={() => requestSign(textPayload(), 'Text')}
                    disabled={Boolean(retryPrompt)}
                >
                    Sign Text
                </button>
                <button
                    onClick={() => requestSign(binaryPayload(), 'Binary')}
                    disabled={Boolean(retryPrompt)}
                >
                    Sign Binary
                </button>
                <button
                    onClick={() => requestSign(cellPayload(), 'Cell')}
                    disabled={Boolean(retryPrompt)}
                >
                    Sign Cell
                </button>
            </div>

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
                        {retryPrompt.dispatched
                            ? '⚠️ Signature may already exist'
                            : 'Request not delivered'}
                    </strong>
                    <p style={{ margin: '6px 0 10px' }}>
                        {retryPrompt.dispatched ? (
                            <>
                                The {retryPrompt.label.toLowerCase()} sign request was delivered to
                                the wallet inside the connect URL but no signature came back. The
                                wallet may have already signed it. Confirm with the user before
                                retrying — otherwise you may collect a second signature for the same
                                payload.
                            </>
                        ) : (
                            <>
                                The wallet connected but did not receive the request. It is safe to
                                ask the wallet to sign again over the bridge.
                            </>
                        )}
                    </p>
                    <button onClick={() => requestSign(retryPrompt.payload, retryPrompt.label)}>
                        Retry signing ({retryPrompt.label})
                    </button>
                    <button
                        onClick={() => setRetryPrompt(null)}
                        style={{ marginLeft: 8, background: 'transparent' }}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {signDataRequest && (
                <div className="sign-data-tester__debug">
                    <div className="find-transaction-demo__json-label">📤 Sign Data Request</div>
                    <div className="find-transaction-demo__json-view">
                        <ReactJson
                            src={signDataRequest}
                            name={false}
                            theme="ocean"
                            collapsed={false}
                        />
                    </div>
                </div>
            )}

            {signDataResponse && (
                <div className="sign-data-tester__debug">
                    <div className="find-transaction-demo__json-label">📥 Sign Data Response</div>
                    <div className="find-transaction-demo__json-view">
                        <ReactJson
                            src={signDataResponse}
                            name={false}
                            theme="ocean"
                            collapsed={false}
                        />
                    </div>
                </div>
            )}

            {verificationResult && (
                <div className="sign-data-tester__debug">
                    <div className="find-transaction-demo__json-label">✅ Verification Result</div>
                    <div className="find-transaction-demo__json-view">
                        <ReactJson
                            src={verificationResult}
                            name={false}
                            theme="ocean"
                            collapsed={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
