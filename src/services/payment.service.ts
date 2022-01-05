import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentStatus } from 'src/enum/payment_status';
import { Payment, PaymentDocument } from 'src/schemas/payment.schema';

@Injectable()
export class PaymentService {
  constructor(@InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>) {}

  async create(paymentDto: any): Promise<any> {
    const order = new this.paymentModel(paymentDto);
    return order.save();
  }

  async findAll(): Promise<any[]> {
    return this.paymentModel.find().exec();
  }

  public async findOne(_id): Promise<any> {
    return this.paymentModel.findOne({ _id: _id });
  }

  public async findProgressing(): Promise<any[]> {
    return this.paymentModel.find( { $or: [ { order_status: PaymentStatus.waiting }, { order_status: PaymentStatus.partially_paid } ]}).exec();
  }

  public async update(_id, paymentDto) {
    return this.paymentModel.findOneAndUpdate({ _id: _id }, paymentDto,  {upsert: true})
  }
}
