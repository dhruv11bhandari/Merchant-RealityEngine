export type EventType = 'SALE' | 'REFUND' | 'TRANSFER' | 'SETTLEMENT' | 'CHARGEBACK';
export type Channel = 'POS' | 'UPI_LINK' | 'UPI_COLLECT' | 'ONLINE' | 'PAYOUT' | 'BANK';

/** Normalised payment event (L1 output). All timestamps are epoch ms. */
export interface PaymentEvent {
  id: string;
  merchantId: string;
  type: EventType;
  amount: number;
  eventTime: number;          // payer authorisation / event time
  settleTime?: number;        // bank settlement time (separate from event time)
  ingestTime: number;         // when MRE received the record
  payerRef: string;           // synthetic raw identifier, shown only to demonstrate hashing
  payerHash: string;          // hashed payer identifier
  destHash: string;           // hashed destination (refund / transfer target)
  payerState: string;         // 2-letter state code
  linkedSaleId?: string;      // refund -> original sale
  beneficiaryHash?: string;   // settlement / payout beneficiary
  channel: Channel;
  linkId?: string;            // payment link used, if any
  orderId?: string | null;    // order feed linkage, if available
  source: string;             // lineage: originating feed
}
