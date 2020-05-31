module.exports = {
    run: function(spawn) {
        this.memCleanup();
        
        var room = spawn.room;
        var roomCreeps = room.find(FIND_MY_CREEPS);
        var counts = _.countBy(roomCreeps, 'memory.role');
        var minerCount = counts.miner || 0;
        var upgraderCount = counts.upgrader || 0;
        var builderCount = counts.builder || 0;
        var haulerCount = counts.hauler || 0;
        
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
        
        if (minerCount < sourceCount*minerMultiplyer+extractor_count && 
            !spawn.room.memory.attacked)
        {
            this.spawn(spawn, "miner");
        } else
        if (haulerCount < containerCount && 
            haulerCount < sourceCount &&
            haulerCount < sourceCount - linkCount+2) 
        {
            this.spawn(spawn, "hauler");
        } else 
        if (upgraderCount < 1)
        {
            this.spawn(spawn, "upgrader");
        } else 
        if (builderCount < sourceCount + room.memory.stats.add_creeps)
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
        
        let bodySize = baseCreep.getSuitableBodySize(role, spawn.room.energyAvailable);
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
