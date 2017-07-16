import { AccountManager } from './accountManager';
import Trader = require('./bitshares');
//import * as trader from './bitshares';
import logger from './logger';

let trade = process.argv.some(x=>x == '-trade')
let debug = process.argv.some(x=>x == '-debug')

logger.info("Параметры запуска: " + process.argv)

// Settings

let account = "slidtrader1";
let asset = "OPEN.BTC";
let currency = "USD";

let trader: Trader = new Trader({ account: account, currency: currency, asset: asset, trade: trade });

let accountManager: AccountManager = new AccountManager(trader);

// Run and schedule

//import { scheduleJob } from 'node-schedule';
let schedule = require('node-schedule');

schedule.scheduleJob("*/5 * * * *", run);

run();

async function run() {

	logger.info("=========================== Заупуск цикла =========================================");

	let orderVolume = 0.001;

	let orders = await accountManager.getOrders();

	if(!orders) {
		logger.warn("Не удалось получить список ордеров.");
		finishRun();
		return;
	}
	
	let askandbid = getTheBestAskAndBid(orders, orderVolume);

	if(!askandbid || !askandbid.newAsk || !askandbid.newBid) {
		logger.warn("bestAsk и bestBid не определен.");
		finishRun();
		return;
	}

	let { newAsk, newBid } = askandbid;

	if(!isProfitable(newAsk, newBid)) {
		logger.info("Вычисленные bestAsk и bestBid не принесут прибыль.");
		finishRun();
		return;
	}

	let openedOrders = await accountManager.getOpenedOrders();

	if(!openedOrders || !openedOrders.buyOrders || !openedOrders.sellOrders) {
		logger.error("Не удалось получить открытые ордера");
		return;
	}

	if(openedOrders.buyOrders.length == 0) {
		logger.info("Покупаем");
		await accountManager.buy(orderVolume, newBid);	
	}
	else
		logger.info("Мы уже имеем открытую позицию на покупку.");

	if(openedOrders.sellOrders.length == 0) {
		logger.info("Продаем");	
		await accountManager.sell(orderVolume, newAsk);
	}
	else
		logger.info("Мы уже имеем открытую позицию на продажу.");

	let portfollio = await accountManager.getPortfollio();

	//logger.info("Баланс: " portfollio);

	finishRun();
}

function finishRun() {
	logger.info("=========================== Конец цикла =========================================");
}

function isProfitable(newAsk: number, newBid: number) {
	
	//let fee = 0.0018; //USD
	//let fee = 0.01213; //BTS
	let fee = 0.0000002; //BTC

	let avgPrice = (newAsk + newBid) / 2;

	let profit = (Math.abs(newAsk - newBid) - fee * 2) / avgPrice;

	if(profit > 0)
		return true;
	else
		return false;
}

function getTheBestAskAndBid(orders: any, orderVolume: number) {

	let smallVolume = orderVolume * 0.1; // 10% от объема

	let asks = Object.keys(orders.asks).map(k=>parseFloat(k)).sort();
	let bids = Object.keys(orders.bids).map(k=>parseFloat(k)).sort((a,b) => b-a);

	let total = 0;

	let bestAsk = asks.find(element => {
		total += orders.asks[element].convertedForSale;

		return total > smallVolume;
	});

	total = 0;

	let bestBid = bids.find(element => {
		total += orders.bids[element].convertedForSale;

		return total > smallVolume;
	});

	if(!bestAsk || !bestBid) {
		logger.warn("Не удалось вычислить bestAsk и bestBid.")
		return;
	}

 	let percentToBetterPrice = 0.0001; // 0.01 %

    let newAsk = bestAsk * (1 - percentToBetterPrice);
    let newBid = bestBid * (1 + percentToBetterPrice);

	return { newAsk: newAsk, newBid: newBid };
}