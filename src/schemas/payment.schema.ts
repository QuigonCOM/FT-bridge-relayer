import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { PaymentStatus } from 'src/enum/payment_status';

export type PaymentDocument = Payment & Document;

@Schema()
export class Payment {
    @Prop({ type: String, required: true })
    recipient_address: string;

    @Prop({ type: String })
    payment_description: string;

    @Prop({ type: String, required: true })
    pay_address: string;

    @Prop({ type: String, required: true })
    pay_privateKey: string;

    @Prop({ type: String, required: true })
    price_amount: String;

    @Prop({ type: String, required: true })
    pay_currency: string;

    @Prop({ type: String, required: true })
    pay_amount: string;

    @Prop({ type: String, required: true, enum: PaymentStatus })
    payment_status: string;

    @Prop({ type: [String] })
    transactionHashs: [string];

    @Prop({ type: String })
    actually_paid: string;

    @Prop({ type: String })
    ipn_callback_url: string;

    @Prop({type: Date })
    created_at: Date;

    @Prop({type: Date })
    updated_at: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);