module.exports =  {
    run: function(room) {
        this.getTotalEnergyLevel(room);
        this.getTransportStats(room);
    },
    
    
    getTotalEnergyLevel: function(room) {
        if (!room.memory.stats) {
            room.memory.stats = {};
        }
        
        
        var capacity = room.energyCapacityAvailable;
        var energy = room.energyAvailable;
        
        var storages = room.find(FIND_STRUCTURES, {
            filter: (s) => { 
                return s.structureType == STRUCTURE_STORAGE ||
                    s.structureType == STRUCTURE_CONTAINER ||
                    s.structureType == STRUCTURE_TOWER; }});
                    
        for(var s of storages)
        {
            capacity += s.store.getCapacity(RESOURCE_ENERGY);
            energy += s.store[RESOURCE_ENERGY];
        }
        
        room.memory.stats.energy = energy;
        room.memory.stats.capacity = capacity;
        
        var elevel = energy/capacity;
        
        //stats and time dependent collecting
        if (Game.time % 1000 == 9) {
            if (!room.memory.stats.energy_1k) {
                room.memory.stats.energy_1k = energy;
                room.memory.stats.add_creeps = 1;
            }
            
            room.memory.stats.energy_1k_dx = room.memory.stats.energy - room.memory.stats.energy_1k;
            room.memory.stats.energy_1k = energy;
            
            //average of 30 times
            room.memory.stats.energy_1k_dx30 = 
                room.memory.stats.energy_1k_dx30*29 + 
                room.memory.stats.energy_1k_dx;
            room.memory.stats.energy_1k_dx30 = Math.round(room.memory.stats.energy_1k_dx30/30);
            
            //add builders
            if (room.memory.stats.energy_1k_dx > 1000 && elevel >= 0.15 || 
                elevel >= 0.95) {
                room.memory.stats.add_creeps += 1;
                if (room.memory.stats.add_creeps > 6) {
                    room.memory.stats.add_creeps = 6;
                } else {
                    console.log(room.name + ": incr number of builders");
                }
            }
            
            //remove builders
            if (room.memory.stats.energy_1k_dx < 0 && elevel <= 0.15 ||
                elevel <= 0.05)
            {
                room.memory.stats.add_creeps -= 1;
                if (room.memory.stats.add_creeps < 0) {
                    room.memory.stats.add_creeps = 0;
                } else {
                    //remove one builder
                    console.log(room.name + ": decr number of builders");
                    var creeps = room.find(FIND_MY_CREEPS, {filter: (s) => s.memory.role == "builder" && !s.memory.killSelf });
                    if (creeps.length > 0) {
                        creeps[0].memory.killSelf = true;
                        creeps[0].memory.renewSelf = true;
                    }
                }
            } 
        }
        if (Game.time % 10000 == 9) {
            if (!room.memory.stats.energy_10k) {
                room.memory.stats.energy_10k = energy;
            }
            
            room.memory.stats.energy_10k_dx = room.memory.stats.energy - room.memory.stats.energy_10k;
            room.memory.stats.energy_10k = energy;
            
            //average of 30 times
            room.memory.stats.energy_10k_dx30 = 
                room.memory.stats.energy_10k_dx30*29 + 
                room.memory.stats.energy_10k_dx;
            room.memory.stats.energy_10k_dx30 = Math.round(room.memory.stats.energy_10k_dx30/30);
        }
    }, 
    
    getTransportStats: function(room)
    {
        var volume = 0;
        for (var i in room.memory.ltasks) {
            volume += room.memory.ltasks[i].vol;
        }
        
        room.memory.stats.transports = volume;
        //room.memory.stats.haulers_needed = 5;
        //return;
        
        if (Game.time % 1000 == 9) {
            if (!room.memory.stats.transports_1k_30) {
                room.memory.stats.transports_1k_30 = volume;
                room.memory.stats.haulers_needed = 1;
            }
            
            room.memory.stats.transports_1k = volume;
            room.memory.stats.transports_1k_30 = Math.round((room.memory.stats.transports_1k_30*29+volume)/30);
            
            //calc haulers
            var currentBodySize = Math.min(baseCreep.getSuitableBodySize("", room.energyAvailable), 5);
            var haulerNeeded = Math.round(room.memory.stats.transports_1k_30 / (currentBodySize*100));
            haulerNeeded = Math.max(Math.min(haulerNeeded, 5), 1);
            
            if (room.memory.stats.haulers_needed < haulerNeeded) {
                room.memory.stats.haulers_needed++;
                console.log(room.name + ": incr number of haulers");
            } else if (room.memory.stats.haulers_needed > haulerNeeded) {
                room.memory.stats.haulers_needed--;
                console.log(room.name + ": decr number of haulers");
                var creeps = room.find(FIND_MY_CREEPS, {filter: (s) => s.memory.role == "hauler" && !s.memory.killSelf });
                if (creeps.length > 0) {
                    creeps[0].memory.killSelf = true;
                }
            }
        }
    }
    
    
};