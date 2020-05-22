var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if (!creep.memory.harvesting && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.harvesting = true;
            delete creep.memory.source;
            delete creep.memory.building;
        }
        if (creep.memory.harvesting && creep.store.getFreeCapacity() == 0) {
            creep.memory.harvesting = false;
            delete creep.memory.source;
            delete creep.memory.building;
        }
        
        if (creep.memory.harvesting)
        {
            //check energy levels sufficient for building
            if (baseCreep.skipDueEnergyLevels(creep)) return;
            
	        if (!creep.memory.source)
	        {
		        baseCreep.pickEnergySource(creep);
	        }
	        
	        baseCreep.goGetEnergyFromSource(creep);
	        
        } else {
            
            if (!creep.memory.building)
            {
                roleBuilder.pickBuildTarget(creep);
            }
            
            
            var target = Game.getObjectById(creep.memory.building);
            if (!target) { delete creep.memory.building; return; }
            
            if (target instanceof ConstructionSite)
            {
                //build
                if(creep.build(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#00ff00'}});
                }
            } 
            else if (target instanceof StructureController) 
            {
                //upgrade
                if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#00ff00'}});
                }
            }
            else 
            {
                //repair
                if(creep.repair(target) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#00ff00'}});
                }
                if (target.hits == target.hitsMax)
                {
                    delete creep.memory.building;
                }
            }
            
	       
        }
    }, 
    
    
    pickBuildTarget: function(creep) {
        
        //repairs needed - except mining containers
        var repairs = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return (
                    structure.structureType != STRUCTURE_WALL && 
                    structure.structureType != STRUCTURE_RAMPART && 
                    structure.hits < structure.hitsMax && 
                    structure.pos.findInRange(FIND_SOURCES, 2).length == 0);
            }
        });
        if (repairs)
        {
            creep.memory.building = repairs.id;
            return;
        }
        
        
        //construction sites
        var targets = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if(targets) {
            creep.memory.building = targets.id;
            return;
        }
        
        
        //fortify walls
        var walls = creep.room.find(FIND_STRUCTURES, {filter: (s) => { 
            return (s.structureType == STRUCTURE_WALL || 
            s.structureType == STRUCTURE_RAMPART) && 
            s.hits < s.hitsMax; 
        }});
        if (walls.length > 0) {
            walls = _.orderBy(walls, (s) => s.hits);
            creep.memory.building = walls[0].id;
        }
        
        //upgrade if no thing else to do
        creep.memory.building = creep.room.controller.id;
        

    }
    
};

module.exports = roleBuilder;
