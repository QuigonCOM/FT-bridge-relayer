import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BridgeService } from './bridge.service';

@Controller()
export class AppController {
  constructor(
    private readonly bridgeService: BridgeService,
  ) {}

  // // Create payment
  // @Post('payment')
  // async createOrder(@Body('payment') payment) {
  //   // Get erc20 token type
  //   const tokenInfo = await this.appService.getTokenInfo(payment.pay_currency.toString().toUpperCase());

  //   // Check token is avaialble or not in gateway
  //   if (!tokenInfo.available) {
  //     return {
  //       error: true,
  //       message: "Invalid token"
  //     }
  //   }

  //   // Create temp account to receive payment
  //   const account = await this.appService.createAccount();
  //   payment.pay_address = account.address;
  //   payment.pay_privateKey = account.privateKey;
  //   payment.payment_status = PaymentStatus.waiting;

  //   // Check token price
  //   const price_response = await this.appService.getPrice(payment.pay_currency);
  //   const price = price_response.data.data.quote.USD.price
  //   payment.pay_amount = this.appService.toWei((Math.round(payment.price_amount / price * Math.pow(10, tokenInfo.decimals)) / Math.pow(10, tokenInfo.decimals)).toString(), payment.pay_currency);

  //   payment.created_at = new Date();
  //   payment.transactionHashs = [];
  //   payment.actually_paid = 0;

  //   // Create new payment
  //   let saved = await this.paymentService.create(payment);
    
  //   return {
  //     payment_id : saved._id,
  //     payment_status: saved.payment_status,
  //     pay_amount: saved.pay_amount,
  //     pay_currency: saved.pay_currency,
  //     price_amount: saved.price_amount,
  //     pay_address: saved.pay_address,
  //     recipient_address: saved.recipient_address,
  //     actually_paid: saved.actually_paid,
  //     transactionHashs : saved.transactionHashs,
  //     payment_description: saved.payment_description,
  //     ipn_callback_url: saved.ipn_callback_url,
  //     created_at: saved.created_at,
  //     updated_at: payment.updated_at
  //   }
  // }

  // // Get payment details
  // @Get('payment/:id')
  // async getPaymentStatus(@Param('id') payment_id) {
  //   const payment = await this.paymentService.findOne(payment_id);
  //   return {
  //     payment_id : payment._id,
  //     payment_status: payment.payment_status,
  //     pay_amount: payment.pay_amount,
  //     pay_currency: payment.pay_currency,
  //     price_amount: payment.price_amount,
  //     pay_address: payment.pay_address,
  //     recipient_address: payment.recipient_address,
  //     actually_paid: payment.actually_paid,
  //     transactionHashs : payment.transactionHashs,
  //     payment_description: payment.payment_description,
  //     ipn_callback_url: payment.ipn_callback_url,
  //     created_at: payment.created_at,
  //     updated_at: payment.updated_at
  //   }
  // }
}
