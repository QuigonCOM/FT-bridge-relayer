import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Interval } from '@nestjs/schedule';
import { BigNumber, ethers, providers } from 'ethers';
import bridge_bsc from './abi/bridge_bsc';

@Injectable()
export class BridgeService {
  private lastBSCBlockNumber = 0;
  private lastETHBlockNumber = 0;

  private eth_provider = new providers.JsonRpcProvider(process.env.ETH_RPC_URL);
  private bsc_provider = new providers.JsonRpcProvider(process.env.BSC_RPC_URL);

  private init_address = process.env.INIT_ADDRESS;
  private saferocket_address = process.env.SAFEROCKET_TEST_ADDRESS;

  private eth_bridge_address = process.env.ETH_BRIDGE_ADDRESS;
  private bsc_bridge_address = process.env.BSC_BRIDGE_ADDRESS;

  async sendTokenToETH(address, amount) {
    console.log('Send SAFEROCKET to INIT', address, amount);
    var privateKey = process.env.RERALYER_PRIVATE_KEY;
    var wallet = new ethers.Wallet(privateKey, this.eth_provider);
    var bridgeContract = new ethers.Contract(
      this.eth_bridge_address,
      bridge_bsc,
      wallet,
    );

    bridgeContract.transfer(address, amount).then(
      (result) => {
        console.log(result);
      },
      (error) => {
        console.log(error);
      },
    );
    console.log(bridgeContract);
  }

  async sendTokenToBSC(address, amount) {
    console.log('Send SAFEROCKET to INIT', address, amount);
    var privateKey = process.env.RERALYER_PRIVATE_KEY;
    var wallet = new ethers.Wallet(privateKey, this.eth_provider);
    var bridgeContract = new ethers.Contract(
      this.bsc_bridge_address,
      bridge_bsc,
      wallet,
    );

    bridgeContract.transfer(address, amount).then(
      (result) => {
        console.log(result);
      },
      (error) => {
        console.log(error);
      },
    );
    console.log(bridgeContract);
  }


  /**
   * Check SAFEROCKET transactions to BSC Bridge
   * @returns
   */
  @Interval(1000)
  async checkBSCBlock() {
    const blockNumber = await this.bsc_provider.getBlockNumber();
    if (blockNumber <= this.lastBSCBlockNumber) return;
    this.lastBSCBlockNumber = blockNumber;
    const block = await this.bsc_provider.getBlock(blockNumber);

    if (block && block.transactions) {
      console.log(blockNumber, block.transactions.length);
      for (let txHash of block.transactions) {
        let txData = await this.bsc_provider.getTransaction(txHash);
        if (!txData || !txData.to) continue;

        const fromAddress = txData.from.toString().toLowerCase();
        const toAddress = txData.to.toString().toLowerCase();
        if (toAddress == this.saferocket_address.toString().toLowerCase()) {
          let txReceipt = await this.bsc_provider.getTransactionReceipt(txHash);
          console.log(txReceipt);

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
            if (
              event.toString().toLowerCase() ==
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
              to.toString().toLowerCase() ==
                this.bsc_bridge_address.toString().toLowerCase() &&
              data
            ) {
              const amount = BigNumber.from(data);
              this.sendTokenToETH(from, amount.toString());
            }
          }
        }
      }
    }
  }

  /**
   * Check INIT transactions to ETH Bridge
   * @returns
   */
  @Interval(1000)
  async checkETHBlock() {
    const blockNumber = await this.eth_provider.getBlockNumber();
    if (blockNumber <= this.lastETHBlockNumber) return;
    this.lastETHBlockNumber = blockNumber;
    const block = await this.bsc_provider.getBlock(blockNumber);

    if (block && block.transactions) {
      console.log(blockNumber, block.transactions.length);
      for (let txHash of block.transactions) {
        let txData = await this.eth_provider.getTransaction(txHash);
        if (!txData || !txData.to) continue;

        const fromAddress = txData.from.toString().toLowerCase();
        const toAddress = txData.to.toString().toLowerCase();
        if (toAddress == this.saferocket_address.toString().toLowerCase()) {
          let txReceipt = await this.bsc_provider.getTransactionReceipt(txHash);
          console.log(txReceipt);

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
            if (
              event.toString().toLowerCase() ==
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' &&
              to.toString().toLowerCase() ==
                this.bsc_bridge_address.toString().toLowerCase() &&
              data
            ) {
              const amount = BigNumber.from(data);
              this.sendTokenToBSC(from, amount.toString());
            }
          }
        }
      }
    }
  }
}
