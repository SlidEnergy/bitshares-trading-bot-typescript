import logger from './logger';

export class AccountManager {
	constructor(
		private trader: any) {
	}

	async buy(amount: number, price: number) {

		let portfollio = await this.getPortfollio();

		if(!this.hasMoney(portfollio, this.trader.currency, amount * price)) {
			logger.info("недостаточно денег");
			return;
		}

		await this.trader.buy(amount, price);
	}

	async sell(amount: number, price: number) {
		
		let portfollio = await this.getPortfollio();

		if(!this.hasMoney(portfollio, this.trader.asset, amount)) {
			logger.warn("недостаточно денег");
			return;
		}
		
		await this.trader.sell(amount, price);
	}
	
	async getOrders() {
		logger.info("Получаем все ордера");
		return await this.trader.getOrders();
	}

	public async getPortfollio() {
		logger.info("Получаем портфель пользователя");
		return await this.trader.getPortfollio();
	}

	public async getOpenedOrders() {

		logger.info("Получаем наши открытые ордера");

		let orders = await this.trader.getOpenedOrders();

		return {
			buyOrders: orders.filter((element: any) => {
				return element.sell_price.base.asset_id == this.trader.markets[this.trader.currency].asset_id &&
					element.sell_price.quote.asset_id == this.trader.markets[this.trader.asset].asset_id
			}),
			sellOrders: orders.filter((element: any) => {
				return element.sell_price.base.asset_id == this.trader.markets[this.trader.asset].asset_id &&
					element.sell_price.quote.asset_id == this.trader.markets[this.trader.currency].asset_id
		})}
	}


	private hasMoney(portfollio: any, asset: string, amount: number) {
		let fee = 0.01213;

		if(portfollio["BTS"] < fee) {
			logger.info("На счете нет BTS для уплаты коммиссии.");
			return false;
		}

		if(portfollio[asset] < amount) {
			logger.info("На счете не хватает средств " + asset + " для размещения ордера.");
			return false;
		}

		return true;
	}
}