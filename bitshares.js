var _ = require('lodash');
const co = require('co');
const path = require('path');

let api_lib = require('openledger_nodejs_api/libs');

require('./bitshares-cfg.js')(api_lib); // patching to pass private keys and wssapi address

let markets = {
	"USD": { precision: 4, asset_id: "1.3.121" },
	"OPEN.BTC": { precision: 8, asset_id: "1.3.861" },
	"BTS": { precision: 5, asset_id: "1.3.0" }
}

var Trader = function(config) {
  _.bindAll(this);
  if(_.isObject(config)) {
    this.account = config.account
    this.currency = config.currency;
    this.asset = config.asset;
	this.trade = config.trade;
  }
  this.name = 'Bitshares';
  this.balance;
  this.price;
  this.markets = markets;

  this.pair = [this.currency, this.asset].join('_');
}

Trader.prototype.buy = async function(amount, price) {

    var message = {
        from: this.account,
        amount_to_sell: {
            "amount": Math.floor(amount * price * Math.pow(10, markets[this.currency].precision)),
            "asset_id": this.currency
        },
        "min_to_receive": {
            "amount": Math.floor(amount * Math.pow(10, markets[this.asset].precision)),
            "asset_id": this.asset
        },
        debug: !this.trade, // 'transction not real if debug equal true'
        type: "limit_order_create"
    };

    console.log("limit_order_create... message: " + JSON.stringify(message));

    var result = await co(api_lib.transfer(message)).catch(catch_err);

    //console.log(result);
	console.log("result: " + JSON.stringify(result));
}

Trader.prototype.sell = async function(amount, price) {
    var message = {
        from: this.account,
        amount_to_sell: {
            "amount": Math.floor(amount * Math.pow(10, markets[this.asset].precision)), 
            "asset_id": this.asset 
        },
        "min_to_receive": {
            "amount": Math.floor(amount * price * Math.pow(10, markets[this.currency].precision)), 
            "asset_id": this.currency 
        },
        debug: !this.trade, // 'transction not real if debug equal true'
        type: "limit_order_create" // 'do not change this key'
    };

    console.log("limit_order_create... message: " + JSON.stringify(message))

    var result = await co(api_lib.transfer(message)).catch(catch_err);

    //console.log(result);
	console.log("response: " + JSON.stringify(result));
}

Trader.prototype.getOrders = async function() {
    try
	{
        let message = {
            base: markets[this.asset].asset_id,
            quote: markets[this.currency].asset_id,
            type: "get_orders"
        };

        //console.log("get_orders...");

        var result = await co(api_lib.history(message));

        //console.log(result);
        //console.log(JSON.stringify(result, null, 2));

        return result;
   	}
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.checkOrders = async function() {
    try
	{
        let message = {
            orders: [ markets[this.asset].asset_id, markets[this.currency].asset_id ],
            type: "check_orders"
        };

        //console.log("check_orders...");

        var result = await co(api_lib.history(message));

        //console.log(result);
        //console.log(JSON.stringify(result, null, 2));
        
        return result;
   	}
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.getPortfollio = async function() {
    try
    {
		let history = await this._getHistory();

		return history[this.account].balance;
    }
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.getOpenedOrders = async function() {
    try
    {
		let history = await this._getHistory();

		return history[this.account].limit_orders;
    }
	catch(err) {
		catch_err(err);
	}
}


Trader.prototype._getHistory = async function() {
    try
    {
        let message = {
            account: this.account, // an account which history you want to get
            position: 0, // start position from history getting
            //option: 'realorders',
            type: 'account_history'
        };

        //console.log("account_history...");

        var result = await co(api_lib.history(message));

        //console.log(result);

        return result;
    }
	catch(err) {
		catch_err(err);
	}
}

function catch_err(err) {

	console.log("\x1b[31m", err, "\x1b[0m");

	if (err && err.message) {
		_error_message = err.message.toLowerCase().split('{')[0].match(/[a-z,0-9,\,\-]+/g).filter((e, i, arr) => {
			return arr[i] !== arr[i + 1] && arr[i] !== arr[i + 2];
		}).join(' ');
	} else {
		_error_message = { "_error": "unknown error" };
	}

	console.log(_error_message);
}

module.exports = Trader;