module.exports = {
    name: "queen", 
    run: function(creep)
    {
        baseCreep.init(creep);
        
        if (creep.memory.pickup === undefined) {
            creep.memory.pickup = true;
        }
        
        //end of life recycle
        if (creep.memory.pickup && creep.ticksToLive <= 10) {
            creep.memory.role = "queen_old";
            creep.memory.renewSelf = true;
            creep.memory.killSelf = true;
        }
        
        //move queen to center
        let center = moduleAutobuilder.getBaseCenterPoint(creep.room);
        if (!creep.pos.isEqualTo(center)) {
            creep.moveTo(center);
            return;
        }
        
        if (creep.memory.pickup) 
        {
            if (this.linkEmptying(creep)) return;
            if (this.towerResupply(creep)) return;
            if (this.terminalResupply(creep)) return;
        } 
        else 
        {
            this.dropoff(creep);
        }
    }, 
    
    
    linkEmptying: function(creep)
    {
        var link = this.getSpawnLink(creep.room);
        if (link.store[RESOURCE_ENERGY] > 0) {
            creep.withdraw(link, RESOURCE_ENERGY);
            creep.memory.pickup = false;
            creep.memory.target = creep.room.storage.id;
            return true;
        }
    }, 
    
    towerResupply: function(creep)
    {
        var towers = creep.pos.findInRange(
            FIND_MY_STRUCTURES, 
            1, 
            {
                filter: (s) => s.structureType == STRUCTURE_TOWER && 
                s.store.getFreeCapacity(RESOURCE_ENERGY) >= 100
            }
        );
        
        if (towers.length > 0) {
            creep.withdraw(creep.room.storage, RESOURCE_ENERGY);
            creep.memory.pickup = false;
            creep.memory.target = towers[0].id;
            return true;
        }
    }, 
    
    terminalResupply: function(creep)
    {
        if (!creep.room.terminal) return;
        var elevel = creep.room.terminal.store[RESOURCE_ENERGY];
        
        if (elevel < 3000) {
            creep.withdraw(creep.room.storage, RESOURCE_ENERGY);
            creep.memory.pickup = false;
            creep.memory.target = creep.room.terminal.id;
            return true;
        }
        if (elevel > 30000) {
            creep.withdraw(creep.room.terminal, RESOURCE_ENERGY);
            creep.memory.pickup = false;
            creep.memory.target = creep.room.storage.id;
            return true;
        }
        
    }, 
    
    
    dropoff: function(creep)
    {
        let target = this.getDropoffTarget(creep);
        let res = baseCreep.getStoredResourceTypes(creep.store);
        
        creep.transfer(target, res[0]);
        creep.memory.pickup = true;
    }, 
    
    getDropoffTarget: function(creep)
    {
        let target = Game.getObjectById(creep.memory.target);
        if (!target) {
            target = creep.room.storage || creep.room.terminal;
        }
        return target;
    }, 
    
    
    getSpawnLink: function(creep)
    {
        var link = Game.getObjectById(creep.memory.link);
        if (!link) {
            link = baseCreep.getSpawnLink(creep);
            creep.memory.link = link.id;
        }
        return link;
    }
};