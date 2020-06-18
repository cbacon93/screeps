module.exports = {
    run: function(room) 
    {
        var res_types = baseCreep.getStoredResourceTypes(room.terminal.store);
        
        //request Energy
        if (room.terminal.store[RESOURCE_ENERGY] < 3000) {
            let amount = 3000 - room.terminal.store[RESOURCE_ENERGY];
            moduleLogistics.addTransportTask(room, room.storage, room.terminal, amount, RESOURCE_ENERGY);
            return;
        }
        
        //cooldown check
        if (room.terminal.cooldown > 0) return;
        
        //sell not needed resources
        for (var res of res_types) 
        {
            if (res != RESOURCE_METAL && 
                res != RESOURCE_MIST &&
                res != RESOURCE_BIOMASS && 
                res != RESOURCE_SILICON && 
                room.terminal.store[res] < 30000 || 
                res == RESOURCE_ENERGY) continue;
            
            if (this.sellResource(room, res, 1000) > 0) return;
        }
        
        //buy resources
        if (room.memory.buy_list && room.memory.buy_list.length > 0)
        {
            for (var i in room.memory.buy_list) {
                var buy = room.memory.buy_list[i];
                let amount = this.buyResource(room, buy.res, buy.amount, buy.max_price);
                if (amount > 0) {
                    buy.amount -= amount;
                    if (buy.amount <= 0) {
                        room.memory.buy_list.splice(i, 1);
                    }
                    return;
                }
            }
        }
        
        //sometimes transport tasks
        Logistics.genTerminalFilling(room);
        this.discountOrders(room);
    }, 
    
    addBuyList: function(room, res, amount, max_price=0.15)
    {
        if (!room.memory.buy_list) {
            room.memory.buy_list = [];
        }
        
        var buy = {
            res: res,
            amount: amount,
            max_price: max_price
        };
        
        room.memory.buy_list.push(buy);
    }, 
    
    
    sellResource: function(room, res, amount, min_price = 0.1)
    {
        var orders = Game.market.getAllOrders((order) => 
            order.resourceType == res &&
            order.type == ORDER_BUY &&
            order.price >= min_price && 
            Game.market.calcTransactionCost(1000, room.name, order.roomName) < 1000
        );
        
        orders = _.sortBy(orders, (o) => -o.price);
        
        if (orders.length > 0)
        {
            amount = Math.min(orders[0].remainingAmount, room.terminal.store[res], amount);
            var ret = Game.market.deal(orders[0].id, amount, room.name);
            if (ret == OK) {
                return amount;
            }
        }
        
        return 0;
    }, 
    
    
    buyResource: function(room, res, amount, max_price=0.15)
    {
        var orders = Game.market.getAllOrders((order) => 
            order.resourceType == res &&
            order.type == ORDER_SELL &&
            order.price <= max_price && 
            Game.market.calcTransactionCost(1000, room.name, order.roomName) < 1000
        );
        
        orders = _.sortBy(orders, (o) => o.price);
        
        if (orders.length > 0)
        {
            amount = Math.min(orders[0].remainingAmount, amount, 3000);
            var ret = Game.market.deal(orders[0].id, amount, room.name);
            if (ret == OK) {
                console.log(room.name + ": bought " + amount + " " + res);
                return amount;
            }
        }
        
        return 0;
    }, 
    
    
    getAvgPrice: function(room, res, type) {
        
    },
    
    discountOrders: function(room) 
    {
        //apply discount to orders
        if (!room.memory.buy_list) {
            room.memory.buy_list = [];
        }
        
        for (var i in room.memory.buy_list) {
            var buy = room.memory.buy_list[i];
            buy.max_price += 0.01;
        }
    },
    
};