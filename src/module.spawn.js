module.exports = {
    run: function(spawn) {
        this.memCleanup();
        
        var room = spawn.room;
        var roomCreeps = _.filter(
            Memory.creeps, 
            (c) => c.home == room.name && (!c.troom || c.troom == room.name)
        );
        var counts = _.countBy(roomCreeps, 'role');
        var minerCount = counts.miner || 0;
        var upgraderCount = counts.upgrader || 0;
        var builderCount = counts.builder || 0;
        var haulerCount = counts.hauler || 0;
        var queenCount = counts.queen || 0;
        
        var sourceCount = room.find(FIND_SOURCES).length;
        var mineralCount = room.find(FIND_MINERALS, {
            filter: (s) => {
                return s.mineralAmount > 0 || s.ticksToRegeneration <= 50;
            }
        }).length;
        var containerCount = room.find(FIND_STRUCTURES, {
	        filter: (structure) => {
	            return structure.structureType == STRUCTURE_CONTAINER;
	        }}).length;
        var linkCount = room.find(FIND_STRUCTURES, {
	        filter: (structure) => {
	            return structure.structureType == STRUCTURE_LINK;
	        }}).length;
        var extractor_count = room.find(FIND_STRUCTURES, {
	        filter: (structure) => {
	            return structure.structureType == STRUCTURE_EXTRACTOR;
	        }}).length;
        //extractors that could be harvested
        extractor_count = Math.min(extractor_count, mineralCount);
        
        var minerMultiplyer = 1;
        if (spawn.room.controller.level <= 4) {
            minerMultiplyer = 2;
        }
        
        if (haulerCount < room.memory.stats.haulers_needed && 
            minerCount >= 1) 
        {
            this.spawn(spawn, "hauler");
        } else 
        if (queenCount < 1 && linkCount >= 2) 
        {
            this.spawn(spawn, "queen");
        } else 
        if (minerCount < sourceCount*minerMultiplyer+extractor_count && 
            !spawn.room.memory.attacked)
        {
            this.spawn(spawn, "miner", {troom: room.name});
        } else
        if (upgraderCount < 1)
        {
            this.spawn(spawn, "upgrader");
        } else 
        if (builderCount < 1 + room.memory.stats.add_creeps)
        {
            this.spawn(spawn, "builder");
        } else  
        
        if (room.memory.spawnList)
        {
            if (room.memory.spawnList.length > 0)
            {
                var ret = this.spawn(
                    spawn, 
                    room.memory.spawnList[0].role, 
                    room.memory.spawnList[0].mem || {});
                if (ret) {
                    room.memory.spawnList.shift();
                }
            }
        }
    },
    
    spawn: function(spawn, role, memory={})
    {
        let data = { memory: {...{role: role}, ...memory}};
        
        var roomCreeps = spawn.room.find(FIND_MY_CREEPS);
        var counts = _.countBy(roomCreeps, 'memory.role');
        var minerCount = counts.miner || 0;
        var haulerCount = counts.hauler || 0;
        
        //try to spawn creeps with full body parts
        //unless colony has to recover (miner or hauler missing, or energy level low)
        var avbl_energy = spawn.room.energyAvailable;
        var energy_ratio = spawn.room.memory.stats.energy / spawn.room.memory.stats.capacity;
        if (minerCount > 0 && haulerCount > 0 && energy_ratio >= 0.05) {
            avbl_energy = spawn.room.energyCapacityAvailable;
        }
        
        let bodySize = baseCreep.getSuitableBodySize(role, avbl_energy);
        let body = baseCreep.buildBody(spawn.room, role, bodySize);
        let name = baseCreep.getName(spawn.room, role);
        var ret = spawn.spawnCreep(body, name, data);
        
        //console.log(body);
        //console.log(ret);
        
        if (ret == OK)
        {
            return true;
        } else {
            return false;
        }
    },
    
    addSpawnList: function(room, role, memory={})
    {
        if (!room.memory.spawnList) {
            room.memory.spawnList = [];
        }
        
        var s = {role: role, mem: memory};
        room.memory.spawnList.push(s);
    }, 
    
    memCleanup: function() {
        //cleanup
        for (var i in Memory.creeps)
        {
            if (!Game.creeps[i])
            {
                delete Memory.creeps[i];
            }
        }
    } 
};
