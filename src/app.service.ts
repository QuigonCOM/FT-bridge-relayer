import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Interval } from '@nestjs/schedule';
import { PaymentService } from './services/payment.service';
import { PaymentStatus } from './enum/payment_status';
const erc20 = require('./abi/erc20.json');
const Web3 = require('web3');

@Injectable()
export class AppService {
  private lastBlockNumber = 0;
  private web3 = new Web3(process.env.ETH_WSS_URL);

  // Constructor
  constructor(private readonly paymentService: PaymentService) {}

  // Create new account
  async createAccount() {
    return await this.web3.eth.accounts.create();
  }

  // Get token price
  async getPrice(pay_currency): Promise<any> {
    const apiUrl = `https://pro-api.coinmarketcap.com/v1/tools/price-conversion?amount=1&symbol=${pay_currency}`;
    const headers = {
      Accept: 'application/json',
      'X-CMC_PRO_API_KEY': `${process.env.COINMARKETCAP_KEY}`,
    };
    return await axios.get(apiUrl, { headers: headers });
  }

  // Get block receipts
  async getBlockReceipts(blockNumber) {
    const headers = { 'Content-Type': 'application/json' };
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'parity_getBlockReceipts',
      params: [blockNumber],
    };
    return await axios.post(process.env.ETH_RPC_URL, body, {
      headers: headers,
    });
  }

  // Check payment is expired or not per 1 hour
  @Interval(60000)
  async checkExpire() {
    const payments = await this.paymentService.findProgressing();
    for (let payment of payments) {
      if (
        payment.payment_status != PaymentStatus.waiting &&
        payment.payment_status != PaymentStatus.partially_paid
      )
        continue;
      let newPayment = payment;
      let created_at = payment.created_at as Date;
      let now = new Date();
      let different = now.getTime() - created_at.getTime();
      if (different > Number(process.env.EXPIRE_DATE)) {
        newPayment.payment_status = PaymentStatus.expired;
      }
      await this.paymentService.update(payment._id, newPayment);
    }
  }

  // Change token amount to wei
  toWei(amount, currency) {
    return this.web3.utils.toWei(amount, this.getTokenInfo(currency).unit);
  }

  // Get available token list
  getTokenInfo(currency) {
    if (currency == 'ETH') {
      return {
        decimals: 18,
        unit: 'ether',
        gas: '21000',
        contract: '',
        available: true,
      };
    } else if (currency == 'USDT') {
      // return { decimals: 6, unit: 'mwei', gas: "200000", contract: "0x110a13FC3efE6A245B50102D2d79B3E76125Ae83", available: true } // ropsten
      return {
        decimals: 18,
        unit: 'ether',
        gas: '200000',
        contract: '0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02',
        available: true,
      }; // rinkeby
    }
    return {
      decimals: 18,
      unit: 'ether',
      gas: '21000',
      contract: '',
      available: false,
    };
  }

  // Send erc20 token to owner wallet
  async sendERC20Token(payment) {
    const info = this.getTokenInfo(
      payment.pay_currency.toString().toUpperCase(),
    );

    const nonse = await this.web3.eth.getTransactionCount(payment.pay_address);

    const value = new this.web3.utils.BN(payment.actually_paid);
    const gasPrice = new this.web3.utils.BN(process.env.GAS_PRICE);
    const gas = new this.web3.utils.BN(info.gas);

    const contract = new this.web3.eth.Contract(erc20, info.contract);
    const sTx = await this.web3.eth.accounts.signTransaction(
      {
        from: payment.pay_address,
        to: info.contract,
        gas: gas.toString(),
        gasPrice: gasPrice.toString(),
        nonse: nonse + 1,
        data: contract.methods
          .transfer(process.env.OWNER_ADDRESS, value)
          .encodeABI(),
      },
      payment.pay_privateKey,
    );
    await this.web3.eth.sendSignedTransaction(sTx.rawTransaction);
  }

  // Complete payment after buyer pay full
  async completePayment(payment) {
    const nonse = await this.web3.eth.getTransactionCount(
      process.env.OWNER_ADDRESS,
    );
    // ETH payment
    if (payment.pay_currency.toString().toUpperCase() == 'ETH') {
      const gasPrice = new this.web3.utils.BN(process.env.GAS_PRICE);
      const gas = new this.web3.utils.BN('21000');
      const gasFee = gasPrice.mul(gas);
      const value = new this.web3.utils.BN(payment.actually_paid).sub(gasFee);
      const sTx = await this.web3.eth.accounts.signTransaction(
        {
          from: payment.pay_address,
          to: process.env.OWNER_ADDRESS,
          value: value.toString(),
          gas: gas.toString(),
          gasPrice: gasPrice.toString(),
          nonse: nonse + 1,
        },
        payment.pay_privateKey,
      );
      await this.web3.eth
        .sendSignedTransaction(sTx.rawTransaction)
        .once('sending', function (payload) {})
        .once('sent', function (payload) {})
        .once('transactionHash', function (hash) {})
        .once('receipt', function (receipt) {})
        .on('confirmation', function (confNumber, receipt, latestBlockHash) {})
        .on('error', function (error) {})
        .then(function (receipt) {});
    } else {
      // ERC20 token
      // Send gas fee to temp address to receive ERC20 token
      const info = this.getTokenInfo(
        payment.pay_currency.toString().toUpperCase(),
      );
      const gasPrice = new this.web3.utils.BN(process.env.GAS_PRICE);
      const gas = new this.web3.utils.BN('21000');
      const gasForTransfer = new this.web3.utils.BN(info.gas);
      const gasFee = gasPrice.mul(gasForTransfer);
      const sTx = await this.web3.eth.accounts.signTransaction(
        {
          from: process.env.OWNER_ADDRESS,
          to: payment.pay_address,
          value: gasFee,
          gas: gas,
          gasPrice: gasPrice,
        },
        process.env.OWNER_PRIVATE_KEY,
      );

      await this.web3.eth
        .sendSignedTransaction(sTx.rawTransaction)
        .once('sending', function (payload) {})
        .once('sent', function (payload) {})
        .once('transactionHash', function (hash) {})
        .once('receipt', function (receipt) {})
        .on('confirmation', function (confNumber, receipt, latestBlockHash) {})
        .on('error', function (error) {})
        .then((receipt) => {
          this.sendERC20Token(payment);
        });
    }
  }

  // Check last block per second
  @Interval(1000)
  async checkBlock() {
    const payments = await this.paymentService.findProgressing();
    let block = await this.web3.eth.getBlock('latest');
    if (block.number == this.lastBlockNumber) return;
    this.lastBlockNumber = block.number;

    console.log(`[*] Searching block ${block.number} ...`);
    if (block && block.transactions) {
      for (let txHash of block.transactions) {
        let txData = await this.web3.eth.getTransaction(txHash);
        let txReceipt = await this.web3.eth.getTransactionReceipt(txHash);

        if (!txData || !txReceipt) continue;

        for (let payment of payments) {
          if (
            payment.payment_status != PaymentStatus.waiting &&
            payment.payment_status != PaymentStatus.partially_paid
          )
            continue;
          if (!txData.to) continue;

          if (payment.pay_currency.toString().toUpperCase() == 'ETH') {
            if (
              txData.to.toString().toLowerCase() ==
                payment.pay_address.toString().toLowerCase() &&
              txData.from.toString().toLowerCase() !=
                process.env.OWNER_ADDRESS.toLowerCase()
            ) {
              let actually_paid = new this.web3.utils.BN(payment.actually_paid);
              let pay_amount = new this.web3.utils.BN(payment.pay_amount);
              let newPayment = payment;
              if (txReceipt.status) {
                actually_paid = actually_paid.add(
                  new this.web3.utils.BN(txData.value),
                );
                if (actually_paid.gte(pay_amount)) {
                  newPayment.payment_status = PaymentStatus.finished;
                } else if (actually_paid.gtn(0)) {
                  newPayment.payment_status = PaymentStatus.partially_paid;
                }
              } else {
                newPayment.payment_status = PaymentStatus.failed;
              }
              newPayment.actually_paid = actually_paid;
              newPayment.transactionHashs.push(txData.hash);
              newPayment.updated_at = new Date();
              const updated = await this.paymentService.update(
                payment._id,
                newPayment,
              );
              if (
                updated &&
                newPayment.payment_status == PaymentStatus.finished
              ) {
                this.completePayment(newPayment);
              }
            }
          } else {
            const tokenInfo = this.getTokenInfo(
              payment.pay_currency.toString().toUpperCase(),
            );
            if (
              txData.to.toString().toLowerCase() ==
              tokenInfo.contract.toString().toLowerCase()
            ) {
              const logs = txReceipt.logs;
              if (
                logs &&
                logs.length > 0 &&
                logs[0].topics &&
                logs[0].topics.length >= 3
              ) {
                const event = logs[0].topics[0];
                const from = '0x' + logs[0].topics[1].toString().substring(26);
                const to = '0x' + logs[0].topics[2].toString().substring(26);
                const data = logs[0].data;
                if (!from || !to || !data) continue;

                const dataNumber = await this.web3.utils.hexToNumberString(
                  data,
                );
                if (
                  event.toString().toLowerCase() ==
                    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
                  data &&
                  to.toString().toLowerCase() ==
                    payment.pay_address.toString().toLowerCase()
                ) {
                  let actually_paid = new this.web3.utils.BN(
                    payment.actually_paid,
                  );
                  let pay_amount = new this.web3.utils.BN(payment.pay_amount);
                  let newPayment = payment;
                  if (txReceipt.status) {
                    actually_paid = actually_paid.add(
                      new this.web3.utils.BN(payment.pay_amount),
                    );
                    if (actually_paid.gte(pay_amount)) {
                      newPayment.payment_status = PaymentStatus.finished;
                    } else if (actually_paid.gtn(0)) {
                      newPayment.payment_status = PaymentStatus.partially_paid;
                    }
                  } else {
                    newPayment.payment_status = PaymentStatus.failed;
                  }
                  newPayment.actually_paid = actually_paid;
                  newPayment.transactionHashs.push(txData.hash);
                  newPayment.updated_at = new Date();
                  const updated = await this.paymentService.update(
                    payment._id,
                    newPayment,
                  );
                  if (
                    updated &&
                    newPayment.payment_status == PaymentStatus.finished
                  ) {
                    this.completePayment(newPayment);
                  }
                }
              }
            }
          }
        }
      }
    }
    console.log(`[*] Searching block ${block.number} finished`);
  }
}
