export = Trader;

declare class Trader {
	constructor(config: any);
	buy(amount: number, price: number): void;
	sell(amount: number, price: number): void;
	getOrders(): any;
	checkOrders(): any;
	getPortfollio(): any;
	getOpenedOrders(): any;
}