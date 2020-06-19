/*
Memory Layout
.role = "miner"
.source = source.id
.container = container.id
.link = link.id	
.containerLinkPurge - special mode pouring the container into the link
Priorities of dropoff
- Link
- Container if link full or not avbl
- Carry to base if Container full or no hauler avbl
*/

module.exports = {
    name: 'miner', 
    run: function(creep) 
    {    
        baseCreep.init(creep);
        creep.memory.noRenew = true;
        
        //go to mining room
        if (creep.memory.troom && creep.memory.troom != creep.room.name) {
            baseCreep.moveToRoom(creep, creep.memory.troom);
            return;
        }
        
        
        var source = this.getSource(creep);
        var container = this.getContainer(creep, source);
        var link = this.getLink(creep, source);
        
        //Special mode
        if (creep.memory.containerLinkPurge) {
            if (this.containerLinkPurge(creep, container, link)) {
                //busy
                return;
            }
        }
        
        this.considerRecycling(creep, source);
        this.considerContainerLinkPurge(creep, source, container, link);
        if (this.considerBuilding(creep, source, container)) return true;
	    this.harvest(creep, source, container, link);
	},
    
    considerRecycling: function(creep, source)
    {
        //source depleted - time to renew?
        if (source instanceof Source) {
            if (source.energy == 0 && creep.ticksToLive <= ENERGY_REGEN_TIME+creep.memory.travelTime) {
                creep.memory.renewSelf = true;
                creep.memory.killSelf = true;
                creep.memory.role = "miner_old";
            }
        }
        
        //mineral depleted - kill self
        if (source instanceof Mineral) {
            if (source.mineralAmount == 0 && source.ticksToRegeneration >= 3600) {
                creep.memory.killSelf = true;
                creep.memory.renewSelf = true;
            }
        }
    }, 
    
    considerBuilding: function(creep, source, container)
    {
        if (source instanceof Source && 
            source.energy == 0)
        {            
            if (!container)
            {
                baseCreep.pickupNearResource(creep);
                
                let csites = source.pos.findInRange(
                    FIND_CONSTRUCTION_SITES, 
                    2, 
                    {filter: (s) => s.structureType == STRUCTURE_CONTAINER}
                );
                
                if (csites.length > 0) 
                {
                    //construct container
                    if (creep.build(csites[0]) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(csites[0], {range: 1, visualizePathStyle: {stroke: '#00ff00'}});
                    }
                    return true;
                } else if (creep.memory.troom != creep.memory.home)
                {
                    //pick container space
                    if (creep.pos.getRangeTo(source.pos) > 1) {
                        creep.moveTo(source, {range: 1, visualizePathStyle: {stroke: '#00ff00'}});
                    } else {
                        creep.room.createConstructionSite(creep.pos, STRUCTURE_CONTAINER);
                    }
                    return true;
                }
                
            } else {
                if (container.hits < container.hitsMax) {
                    creep.withdraw(container, RESOURCE_ENERGY);
                    if (creep.repair(container) != OK) {
                        creep.moveTo(container, {range: 1, visualizePathStyle: {stroke: '#00ff00'}});
                    }
                    return true;
                }    
            }
        }
        return false;
    }, 
    
    
    harvest: function(creep, source, container, link)
    {
        
        //HARVEST
        if(creep.harvest(source) != OK) {
            creep.moveTo(source, {range: 1, visualizePathStyle: {stroke: '#ff0000'}});
            return;
        } else {
            //save travel time
            if (!creep.memory.travelTime) {
                let time = CREEP_LIFE_TIME - creep.ticksToLive;
                time *= 1.25;
                time += 50;
                time = Math.round(time);
                creep.memory.travelTime = time;
            }
        }
        
        
        //link abvl - drop to link immediately
        //ENERGY ONLY
        if (link)
        {
            //put energy into link
            let ret = creep.transfer(link, RESOURCE_ENERGY);
            if (ret == ERR_NOT_IN_RANGE) {
                creep.moveTo(link, {range: 1, visualizePathStyle: {stroke: '#00ff00'}});
                return;
            }
            
            //link full, send to spawn
            if (link.store.getFreeCapacity(RESOURCE_ENERGY) == 0 || creep.memory.renewSelf) {
                baseCreep.sendLinkToSpawn(link);
            }
            
            if (ret == OK) {
                return;
            }
        }
        
        //container in range - carry to container immediately
        if (container)
        {
            //transfer res into containers
            let res_types = baseCreep.getStoredResourceTypes(creep.store);
            let ret = creep.transfer(container, res_types[0]);
            if (ret == ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {range: 1, visualizePathStyle: {stroke: '#00ff00'}});
                return;
            }
            
            if (!link) {
                this.addContainerTransportTask(creep, container);
            }
            
            if (ret == OK) {
                baseCreep.pickupNearResource(creep);
                return;
            }
        }
        
        //drop resource
        let res_types = baseCreep.getStoredResourceTypes(creep.store);
        creep.drop(res_types[0]);
    }, 
    
    considerContainerLinkPurge: function(creep, source, container, link)
    {
        //switch to special mode if container storage full
        if (link && 
            container && 
            source.energy == 0 && 
            link.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && 
            container.store.getUsedCapacity(RESOURCE_ENERGY) > LINK_CAPACITY)
        {
            creep.memory.containerLinkPurge = true;
        }
    }, 
    
    
    //special mode - picks up Energy from container
    //and drops into link
    containerLinkPurge: function(creep, container, link)
    {
        if (!container || !link) { 
            delete creep.memory.containerLinkPurge;
            return false;
        }
        
        //terminating pouring
        if (container.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || 
            link.store.getFreeCapacity(RESOURCE_ENERGY) == 0) 
        {
            baseCreep.sendLinkToSpawn(link);
            delete creep.memory.containerLinkPurge;
            return false;
        }
        
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
            //pickup
            if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(container, {range: 1, visualizePathStyle: {stroke: '#ff0000'}});
            }
        } else {
            //dropoff
            if (creep.transfer(link, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(link, {range: 1, visualizePathStyle: {stroke: '#00ff00'}});
            }
        }
        
        return true;
    }, 
	
    
	pickOwnSource: function(creep) {
		var sources = creep.room.find(FIND_SOURCES);
        
        //also add minerals if extractors present
        if (
            creep.room.find(
                FIND_STRUCTURES, 
                {filter: (s) => s.structureType == STRUCTURE_EXTRACTOR}
            ).length > 0) 
        {
            sources = sources.concat(creep.room.find(FIND_MINERALS));
            
        }
		
		//find new unoccupied source
		var sourcePicked = {};
		for (var source of sources)
		{
			sourcePicked[source.id] = 0;
			
			for (var i in Memory.creeps)
			{
				if (Memory.creeps[i].source == source.id &&
                     Memory.creeps[i].role == "miner")
				{
					sourcePicked[source.id]++;
				}
			}
		}
		
		var min_picked = 9999;
		var min_id = false;
		for(var sid in sourcePicked)
		{
			if (min_picked > sourcePicked[sid]) {
				min_id = sid;
				min_picked = sourcePicked[sid];
			}
		}
		
		if (min_id) {
			creep.memory.source = min_id;
			return true;
		}
		
		return false;
	}, 
	
	pickOwnContainer: function(creep, source) {
		//search containers
		var container = this.getMiningStructure(source, STRUCTURE_CONTAINER);
        if (container) {
            creep.memory.container = container.id;
            return true;
		}
		
		return false;
	},
    
    pickOwnLink: function(creep, source) {
        //only use links for sources
        if (!(source instanceof Source)) return false;
        
        //check if there is a link around spawn
        var spawnlink = baseCreep.getSpawnLink(creep.room);
        if (!spawnlink) return false;
        
        var link = this.getMiningStructure(source, STRUCTURE_LINK);
        if (link) {
            creep.memory.link = link.id;
            return true;
        }
        return false;
    }, 
    
    getMiningStructure: function(source, type)
    {
        var structures = source.pos.findInRange(FIND_STRUCTURES, 2, {
	        filter: (structure) => {
	            return structure.structureType == type;
	        }});
        
        if (structures.length > 0)
		{
            return structures[0];
		}
        return false;
    },
    
    
    getSource: function(creep)
    {
        if (!creep.memory.source) {
            this.pickOwnSource(creep);
        }
        
        return Game.getObjectById(creep.memory.source);
    }, 
    
    getContainer: function(creep, source)
    {
        if (!creep.memory.container) {
            if (Game.time % 20 != 2) return null;
            if (!this.pickOwnContainer(creep, source)) {
                return null;
            }
        }
        
        var container = Game.getObjectById(creep.memory.container);
        if (container) {
            return container;
        } else {
            delete creep.memory.container;
            return null;
        }
    }, 
    
    getLink: function(creep, source)
    {
        if (creep.room.controller.level < 5) return null;
        if (creep.memory.troom != creep.memory.home) return null;
        
        if (!creep.memory.link) {
            if (Game.time % 20 != 3) return null;
            if (!this.pickOwnLink(creep, source)) {
                return null;
            }
        }
        
        var link = Game.getObjectById(creep.memory.link);
        if (link) {
            return link;
        } else {
            delete creep.memory.link;
            return null;
        }
    },
    
    addContainerTransportTask: function(creep, container)
    {
        //hauler vicinity check
        //avoids task volume errors
        var nearhaulers = container.pos.findInRange(FIND_MY_CREEPS, 1, {filter: (c) => c.memory.rome == "hauler"});
        if (nearhaulers.length > 0) return;
        
        var res_types = baseCreep.getStoredResourceTypes(container.store);
        res_types = _.sortBy(res_types, (r) => -container.store.getUsedCapacity(r));
        if (res_types.length > 0 && 
            container.store.getUsedCapacity(res_types[0]) >= 200) 
        {
            Logistics.addTransportTask(
                Game.rooms[creep.memory.home], 
                container.id, 
                null, 
                container.store.getUsedCapacity(res_types[0]), 
                res_types[0], 
                5, 
                "mc");
        }
    }
    
};
