// {res_a: , res_b: , prod: , amount: , started: false, lab_a: , lab_b: , lab_prod: }

module.exports = {
    run: function(room) 
    {
        //assign labs to production
        if (room.memory.labs.production && room.memory.labs.production.length > 0)
        {
            //check if already started
            var prod = room.memory.labs.production[0];
            if (prod.amount <= 0) { room.memory.labs.production.shift(); return; }
            if (prod.started) { return; }
            
            var free_labs = this.getFreeLabTrio(room);
            if (free_labs) {
                prod.started = true;
                prod.lab_prod = free_labs[0].id;
                prod.lab_a = free_labs[1].id;
                prod.lab_b = free_labs[2].id;
                
                // Product
                Labs.Lab.startWork(
                    free_labs[0], 
                    room.memory.labs.labs[free_labs[0].id], 
                    prod.prod, 
                    prod.amount, 
                    true,
                    free_labs[1].id, 
                    free_labs[2].id
                );
                    
                // Resource A
                Labs.Lab.startWork(
                    free_labs[1], 
                    room.memory.labs.labs[free_labs[1].id], 
                    prod.res_a, 
                    prod.amount, 
                    false
                );
                
                // Resource B
                Labs.Lab.startWork(
                    free_labs[2], 
                    room.memory.labs.labs[free_labs[2].id], 
                    prod.res_b, 
                    prod.amount, 
                    false
                );
            }
            
        }
    }, 
    
    startProduction: function(room, res, amount)
    {
        if (Labs.resourceAvailable(room, res, amount)) {
            //else, do nothing - finished
            return;
        }
        if (this.isBaseMineral(res)) {
            Terminal.addBuyList(room, res, amount);
            console.log(room.name + ": Buying " + res);
            return;
        }
        //consider bying instead
        
        //start production
        var base = this.getBaseMinerals(res);
        this.startProduction(room, base.a, amount);
        this.startProduction(room, base.b, amount);
        
        //insert into production queue
        this.insertProductionQueue(room, base.a, base.b, res, amount);
        console.log(room.name + ": Producing " + res);
    },
    
    stopProduction: function(room) 
    {
        if (!room.memory.labs.production || 
            room.memory.labs.production.length <= 0) 
        { return; }
        
        var prod = room.memory.labs.production[0];
        if (!prod.started) { return; }
        
        prod.started = false;
        var lab_c = Game.getObjectById(prod.lab_prod);
        var lab_a = Game.getObjectById(prod.lab_a);
        var lab_b = Game.getObjectById(prod.lab_b);
        
        Labs.Lab.stopWork(lab_a);
        Labs.Lab.stopWork(lab_b);
        Labs.Lab.stopWork(lab_c);
    }, 
    
    insertProductionQueue: function(room, res_a, res_b, res_prod, amount)
    {
        if (!room.memory.labs.production) {
            room.memory.labs.production = [];
        }
        
        var task = {
            res_a: res_a,
            res_b: res_b,
            prod: res_prod,
            amount: amount,
            started: false,
            lab_a: null,
            lab_b: null,
            lab_prod: null
        };
        
        room.memory.labs.production.push(task);
    }, 
    
    
    isBaseMineral: function(res)
    {
        if (res == RESOURCE_HYDROGEN || 
            res == RESOURCE_OXYGEN || 
            res == RESOURCE_UTRIUM ||
            res == RESOURCE_LEMERGIUM ||
            res == RESOURCE_KEANIUM || 
            res == RESOURCE_ZYNTHIUM || 
            res == RESOURCE_CATALYST)
        {
            return true;
        } else {
            return false;
        }
    }, 
    
    
    getBaseMinerals: function(res)
    {
        for(var a in REACTIONS) {
            for(var b in REACTIONS[a]) {
                if (REACTIONS[a][b] == res) {
                    return {a: a, b: b};
                }
            }
        }
        console.log("nothing found for " + res);
    }, 
    
    
    getFreeLabTrio: function(room)
    {
        var prod_lab = room.find(FIND_STRUCTURES, 
            {filter: (s) => { 
                return s.structureType == STRUCTURE_LAB &&
                    s.mineralType == undefined &&
                    room.memory.labs.labs[s.id].state == Labs.Lab.IDLE && 
                    s.pos.findInRange(FIND_STRUCTURES, 2, 
                        {filter: (s2) => s2.structureType == STRUCTURE_LAB && 
                            s2.mineralType == undefined && 
                            room.memory.labs.labs[s2.id].state == Labs.Lab.IDLE}
                    ).length >= 3;
            }}
        );
        if (prod_lab.length > 0) 
        {
            //get resource labs in range
            var res_labs = prod_lab[0].pos.findInRange(
                FIND_STRUCTURES, 
                2, 
                {filter: (s2) => s2.structureType == STRUCTURE_LAB && 
                s2.id != prod_lab[0].id && 
                s2.mineralType == undefined && 
                room.memory.labs.labs[s2.id].state == Labs.Lab.IDLE}
            );
            
            if (res_labs.length >= 2) 
            {
                return [prod_lab[0], res_labs[0], res_labs[1]];
            }
        }
        return false;
    }, 
};