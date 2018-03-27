import * as _ from 'lodash';
import { inject, named } from 'inversify';
import { Logger as LoggerType } from '../../core/Logger';
import { Types, Core, Targets } from '../../constants';
import { EscrowMessage } from '../messages/EscrowMessage';
import { EscrowLockRequest } from '../requests/EscrowLockRequest';
import { EscrowRefundRequest } from '../requests/EscrowRefundRequest';
import { EscrowReleaseRequest } from '../requests/EscrowReleaseRequest';
import { EscrowMessageType } from '../enums/EscrowMessageType';
import { MessageException } from '../exceptions/MessageException';
import * as resources from 'resources';


// Ryno
import { Bid } from '../models/Bid';
import { BidMessageType } from '../enums/BidMessageType';
import { ListingItem } from '../models/ListingItem';
import { CoreRpcService } from '../services/CoreRpcService';

export class EscrowFactory {

    public log: LoggerType;

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.CoreRpcService) private coreRpcService: CoreRpcService
    ) {
        this.log = new Logger(__filename);
    }


    /**
     * Factory which will create an EscrowMessage
     *
     * @param request, EscrowLockRequest | EscrowRefundRequest | EscrowReleaseRequest
     * @param escrow
     * @param address
     *
     * @returns {EscrowMessage}
     */
    public async getMessage(
        request: EscrowLockRequest | EscrowRefundRequest | EscrowReleaseRequest,
        escrow?: resources.Escrow
    ): Promise<EscrowMessage> {

        switch (request.action) {

            case EscrowMessageType.MPA_LOCK:
                return await this.getLockMessage(request as EscrowLockRequest, escrow);

            case EscrowMessageType.MPA_RELEASE:
                return await this.getReleaseMessage(request as EscrowReleaseRequest, escrow);

            case EscrowMessageType.MPA_REFUND:
                return await this.getRefundMessage(request as EscrowRefundRequest, escrow);

            case EscrowMessageType.MPA_REQUEST_REFUND:
                // TODO: IMPLEMENT
                // return this.getRequestRefundMessage(request as EscrowRequestRefundRequest, escrow);
                return new EscrowMessage();
        }

    }

    /**
     * Factory will return model based on the message
     *
     * @param data
     * @returns {Escrow}
     */
    public getModel(data: EscrowMessage): resources.Escrow {

        // TODO:
        return {} as resources.Escrow;
    }

    /**
     * creates the EscrowMessage for EscrowLockRequest
     *
     * @param lockRequest
     * @param escrow
     * @returns {EscrowMessage}
     */
    private async getLockMessage(lockRequest: EscrowLockRequest, escrow?: resources.Escrow): Promise<EscrowMessage> {

        this.checkEscrowActionValidity(EscrowMessageType.MPA_LOCK, escrow);
        const rawTx = await this.createRawTx(lockRequest, escrow);
        // TODO: Sign Raw Transaction at right place, and we don't actually need a message here with shorter flow
        return {
            action: lockRequest.action,
            item: lockRequest.listing,
            nonce: lockRequest.nonce,
            info: {
                memo: lockRequest.memo
            },
            escrow: {
                txid: rawTx
            }
        } as EscrowMessage;
    }

    /**
     * creates the EscrowMessage for EscrowReleaseRequest
     *
     * @param releaseRequest
     * @param escrow
     */
    private async getReleaseMessage(releaseRequest: EscrowReleaseRequest, escrow?: resources.Escrow): Promise<EscrowMessage> {

        this.checkEscrowActionValidity(EscrowMessageType.MPA_RELEASE, escrow);
        const rawTx = await this.createRawTx(releaseRequest, escrow);

        return {
            action: releaseRequest.action,
            item: releaseRequest.listing,
            memo: releaseRequest.memo,
            escrow: {
                type: 'release',
                rawtx: rawTx
            }
        } as EscrowMessage;
    }

    /**
     * creates the EscrowMessage for EscrowRefundRequest
     *
     * @param refundRequest
     * @param escrow
     */
    private async getRefundMessage(refundRequest: EscrowRefundRequest, escrow?: resources.Escrow): Promise<EscrowMessage> {

        this.checkEscrowActionValidity(EscrowMessageType.MPA_REFUND, escrow);
        const rawTx = await this.createRawTx(refundRequest, escrow);

        return {
            action: refundRequest.action,
            item: refundRequest.listing,
            accepted: refundRequest.accepted,
            memo: refundRequest.memo,
            escrow: {
                type: 'refund',
                rawtx: rawTx
            }
        } as EscrowMessage;
    }

    /**
     * Checks if the escrowAction is allowed for the given escrow
     *
     * @param escrowAction
     * @param escrow
     * @returns {boolean}
     */
    private checkEscrowActionValidity(escrowAction: EscrowMessageType, escrow?: resources.Escrow): boolean {
        let isValid = true;
        // TODO: implement
        if (!isValid) {
            isValid = false;
            // throw new MessageException('Action is not valid for the Escrow');
        }
        return isValid;
    }

    /**
     * Creates rawtx based on params
     *
     * @param request
     * @param escrow
     * @returns {string}
     */
    private async createRawTx(request: EscrowLockRequest | EscrowRefundRequest | EscrowReleaseRequest, escrow?: resources.Escrow): Promise<string> {
        // MPA_RELEASE:
        // rawtx: 'The buyer sends the half signed rawtx which releases the escrow and payment.
        // The vendor then recreates the whole transaction (check ouputs, inputs, scriptsigs
        // and the fee), verifying that buyer\'s rawtx is indeed legitimate. The vendor then
        // signs the rawtx and broadcasts it.'

        // MPA_REFUND
        // rawtx: 'The vendor decodes the rawtx from MP_REQUEST_REFUND and recreates the whole
        // transaction (check ouputs, inputs, scriptsigs and the fee), verifying that buyer\'s
        // rawtx is indeed legitimate. The vendor then signs the rawtx and sends it to the buyer.
        // The vendor can decide to broadcast it himself.'

        const listing = await ListingItem.fetchByHash(request.listing);

        const bid: resources.Bid = listing.related('Bids').toJSON()[0];
        const bidData = (await Bid.fetchById(bid.id)).related('BidDatas').toJSON() as resources.BidData[];

        let sellerAddress: string | resources.BidData | undefined = bidData.find(entry => entry.dataId === 'address');
        let rawtx: string | resources.BidData | undefined = bidData.find(entry => entry.dataId === 'rawtx');
        let pubkeys: string | resources.BidData | undefined = bidData.find(entry => entry.dataId === 'pubkeys');
        const isMine = !!listing.toJSON().listingItemTemplateId;


        if (!bid || bid.action !== (isMine ? EscrowMessageType.MPA_RELEASE : BidMessageType.MPA_ACCEPT) // Not sure how to get escrow messages...
            || bidData.length === 0 || !rawtx || !pubkeys || !sellerAddress) {
            this.log.error('No valid information to finalize escrow');
            throw new MessageException('No valid information to finalize escrow');
        }
        rawtx = rawtx.dataValue as string;
        pubkeys = pubkeys.dataValue[0] === '[' ? JSON.parse(pubkeys.dataValue).sort() : pubkeys.dataValue;

        const signTx = async (signrawtx, complete?) => {

            // This requires user interaction, so should be elsewhere possibly?
            // TODO: Verify that the transaction has the correct values! Very important!!! TODO TODO TODO
            const signed = await this.coreRpcService.call('signrawtransaction', [signrawtx]);

            if (!signed || signed.errors && (!complete && signed.errors[0].error !== 'Operation not valid with the current stack size')) {
                this.log.error('Error signing transaction' + signed ? ': ' + signed.errors[0].error : '');
                throw new MessageException('Error signing transaction' + signed ? ': ' + signed.error : '');
            }

            if (complete) {
                if (!signed.complete) {
                    this.log.error('Transaction should be complete at this stage.');
                    throw new MessageException('Transaction should be complete at this stage');
                }
            } else if (signed.complete) {
                this.log.error('Transaction should not be complete at this stage, will not send insecure message');
                throw new MessageException('Transaction should not be complete at this stage, will not send insecure message');
            }

            return signed;
        };

        switch (request.action) {
            case EscrowMessageType.MPA_LOCK:

                // Add Escrow address
                // TODO: Way to recover escrow address should we lose it
                const escrowAddr = (await this.coreRpcService.call('addmultisigaddress', [
                    2,
                    pubkeys,
                    '_escrow_' + request.listing
                ]));

                // TODO: This requires user interaction, so should be elsewhere possibly?
                // TODO: Save TXID somewhere maybe??!
                return await this.coreRpcService.call('sendrawtransaction', [(await signTx(rawtx, true)).hex]);

            case EscrowMessageType.MPA_RELEASE:
                sellerAddress = sellerAddress.dataValue as string;

                const myAddress = await this.coreRpcService.call('getnewaddress', ['_escrow_release']);
                const decoded = await this.coreRpcService.call('decoderawtransaction', [rawtx]);
                const txid = decoded.txid;
                const value = decoded.vout[0].value - 0.0001; // TODO: Proper TX Fee

                if (!txid) {
                    this.log.error(`Transaction with not found with txid: ${txid}.`);
                    throw new MessageException(`Transaction with not found with txid: ${txid}.`);
                }

                const txout = {};

                txout[myAddress] = value / 3;
                txout[sellerAddress] = (value / 3) * 2;

                rawtx = await this.coreRpcService.call('createrawtransaction', [
                    [{txid, vout: 0}],
                    txout
                ]);

                // TODO: This requires user interaction, so should be elsewhere possibly?
                return (await signTx(rawtx)).hex;

            default:
                return 'todo: implement';
        }

    }

    // TODO: Move to BidFactory
    private getAddressOneLiner(address: resources.Address = {} as resources.Address): string {
        const addressArray: any = [];

        if (!_.isEmpty(address)) {
            if (address.addressLine1) {
                addressArray.push(address.addressLine1);
            }
            if (address.addressLine2) {
                addressArray.push(address.addressLine2);
            }
            if (address.zipCode) {
                addressArray.push(address.zipCode);
            }
            if (address.city) {
                addressArray.push(address.city);
            }
            if (address.state) {
                addressArray.push(address.state);
            }
            if (address.country) {
                addressArray.push(address.country);
            }
        }

        return addressArray.join(', ');
    }
}
