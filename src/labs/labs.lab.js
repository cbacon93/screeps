module.exports = {
    IDLE: "idle",
    FILLING: "filling",
    REACTION: "reaction",
    BOOST: "boost",
    EMPTYING: "emptying",
    
    tx_timeout: 150,
    
    run: function(lab, mem)
    {
        this.init(lab, mem);
        
        //request energy
        if (lab.store[RESOURCE_ENERGY] < LAB_ENERGY_CAPACITY-200 && 
            Game.time > mem.energy_request+this.tx_timeout) 
        {
            var req_amount = LAB_ENERGY_CAPACITY - lab.store[RESOURCE_ENERGY];
            moduleLogistics.addTransportTask(lab.room, lab.room.storage, lab, req_amount, RESOURCE_ENERGY);
            mem.energy_request = Game.time;
        }
        
        
        if (mem.state == this.IDLE) return;
        if (mem.state == this.FILLING) 
        {            
            let amount = lab.store[mem.mineralType] || 0;
            let source = lab.room.terminal || lab.room.storage;
            if (amount < mem.amount && mem.resource_request+this.tx_timeout < Game.time) 
            {
                mem.resource_request = Game.time;
                
                //mineral source avbl
                if (!source) return;
                let avbl_amount = source.store[mem.mineralType];
                let needed_amount = mem.amount - amount;
                //check enough minerals for lab ops?
                //otherwise: wait for buy/tx ops to finish
                if (avbl_amount < needed_amount) return;
                
                //tx mineral to lab
                moduleLogistics.addTransportTask(
                    lab.room, 
                    lab.room.terminal, 
                    lab, 
                    needed_amount, 
                    mem.mineralType
                );
            } 
            else if (amount >= mem.amount)
            {
                mem.state = this.REACTION;
                mem.resource_request = 0;
                
                //no reaction, just boosting
                if (!mem.is_producing && mem.boost_creep) 
                {
                    mem.state = this.BOOST;
                }
            }
        }
        if (mem.state == this.REACTION)
        {
            if (!mem.is_producing) return;
            if (lab.cooldown != 0) return;
            var lab_a = Game.getObjectById(mem.lab_a);
            var lab_b = Game.getObjectById(mem.lab_b);
            
            //run reaction
            if (lab_a.store[lab_a.mineralType] > 0 &&
                lab_b.store[lab_b.mineralType] > 0)
            {
                if (lab.runReaction(lab_a, lab_b) == OK)
                {
                    //update mem state
                    mem.amount -= LAB_REACTION_AMOUNT;
                    this.syncLabProgress(lab, mem);
                    
                    //reaction finished
                    if (mem.amount <= 0) 
                    {
                        mem.state = this.EMPTYING;
                        lab.room.memory.labs.labs[lab_a.id].state = this.EMPTYING;
                        lab.room.memory.labs.labs[lab_b.id].state = this.EMPTYING;
                        
                        //enable boosting
                        if (mem.boost_creep) {
                            mem.state = this.BOOST;
                        }
                    }
                }
            }
        }
        if (mem.state == this.BOOST)
        {
            let amount = lab.store[lab.mineralType] || 0;
            
            //send creep ping and wait for boost to finish
            if (mem.resource_request + this.tx_timeout < Game.time) {
                mem.resource_request = Game.time;
                var creeps = Labs.Boost.getCreepDemandList(lab.room, mem.mineralType, amount);
                
                //no creeps for boost - abort
                if (creeps.length == 0) {
                    mem.state = this.EMPTYING;
                }
                
                //call creeps for boost
                for (var id of creeps) {
                    var c = Game.getObjectById(id);
                    if (!c) continue;
                    c.memory.boostSelf = true;
                    c.memory.boostLab = lab.id;
                }
            }
            
            //lab empty - reset
            if (amount == 0) 
            {
                mem.state = this.EMPTYING;
            }
        }
        if (mem.state == this.EMPTYING)
        {
            let amount = lab.store[lab.mineralType] || 0;
            if (amount > 0 && mem.resource_request+this.tx_timeout < Game.time) 
            {
                mem.resource_request = Game.time;
                moduleLogistics.addTransportTask(
                    lab.room, 
                    lab, 
                    lab.room.terminal, 
                    amount, 
                    lab.mineralType
                );
            } else 
            if (amount == 0) 
            {
                //finished - reset
                mem.state = this.IDLE;
                mem.init = false;
                mem.resource_request = 0;
            }
        }
        
    },
    
    
    init: function(lab, mem)
    {
        if (mem.init === true) return;
        mem.init = true;
        mem.state = this.IDLE;
        mem.ready = true;
        mem.energy_request = 0;
        mem.resource_request = 0;
        
        mem.is_producing = false;
        mem.mineralType = null;
        mem.amount = 0;
        mem.lab_a = null;
        mem.lab_b = null;
        mem.boost_creep = false;
        
        //still full check?
        if (lab.store[lab.mineralType] > 0) {
            mem.state = this.EMPTYING;
        }
    }, 
    
    
    startWork: function(lab, mem, resource, amount, is_producing, 
        lab_a = null, lab_b = null, boost_creep = false)
    {
        mem.state = this.FILLING;
        mem.ready = false;
        mem.mineralType = resource;
        mem.amount = amount;
        mem.lab_a = lab_a;
        mem.lab_b = lab_b;
        mem.is_producing = is_producing;
        mem.resource_request = 0;
        mem.boost_creep = boost_creep;
        
        if (mem.is_producing) {
            mem.state = this.REACTION;
        }
    }, 
    
    //writes lab progress to production list memory
    syncLabProgress: function(lab, mem)
    {
        //sync to other labs
        lab.room.memory.labs.labs[mem.lab_a].amount -= LAB_REACTION_AMOUNT;
        lab.room.memory.labs.labs[mem.lab_b].amount -= LAB_REACTION_AMOUNT;
        
        //sync to production list
        var index = _.findIndex(lab.room.memory.labs.production, (s) => s.started == true && s.lab_prod == lab.id);
        if (index >= 0) {
            lab.room.memory.labs.production[index].amount = mem.amount;
        }
    }
};