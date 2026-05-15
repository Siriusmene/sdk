import type {
    SendTransactionResponse,
    SignDataResponse,
    SignMessageResponse
} from '@tonconnect/sdk';

export type EmbeddedTResponse<TResponse> =
    | { response: TResponse; hasResponse: true }
    | {
          connectResult: {
              dispatched: boolean;
          };
          hasResponse: false;
      };

export type EmbeddedSendTransactionResponse = EmbeddedTResponse<SendTransactionResponse>;

export type EmbeddedSignDataResponse = EmbeddedTResponse<SignDataResponse>;

export type EmbeddedSignMessageResponse = EmbeddedTResponse<SignMessageResponse>;
