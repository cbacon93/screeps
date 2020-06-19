module.exports = {
    FRIEND: 'friend',
    ENEMY: 'enemy',
    NEUTRAL: 'neutral',
    
    init: function()
    {
        if (!Memory.intel) {
			Memory.intel = {};
		}
		if (!Memory.intel.list) {
			Memory.intel.list = {};
		}
        if (!Memory.intel.req) {
			Memory.intel.req = [];
		}
        if (!Memory.intel.diplo) {
			Memory.intel.diplo = [];
		}
    },
    
    getIntel: function(roomname) {
        this.init();
        return Memory.intel.list[roomname] || undefined;
    }, 
    
    collectIntel: function(creep, room) {
        //skip own rooms
        if (room.controller && room.controller.my) {
            
            //delete own intel pages
            if (Memory.intel && Memory.intel.list && Memory.intel.list[room.name]) {
                delete Memory.intel.list[room.name];
            }
            return;
        }
		this.init();
		
		
		
		//recent intel
		if (Memory.intel.list[room.name] && 
            Memory.intel.list[room.name].time+100 > Game.time) 
        {
			return;
		}
        
        var creeps = room.find(FIND_HOSTILE_CREEPS);
        var struct = room.find(FIND_HOSTILE_STRUCTURES);
        var minerals = room.find(FIND_MINERALS);
        var deposits = room.find(FIND_DEPOSITS);
        var source_keeper = room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_KEEPER_LAIR});
        var invaderCores = room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_INVADER_CORE});
        
        
        var intel = {};
        intel.name = room.name;
        intel.time = Game.time;
        intel.sources = room.find(FIND_SOURCES).length;
        intel.minerals = null;
        if (minerals.length > 0) {
            intel.minerals = minerals[0].mineralType;
            intel.minerals_amt = minerals[0].mineralAmount;
            
            var extractors = minerals[0].pos.findInRange(
                FIND_STRUCTURES, 
                0, 
                {filter: (s) => s.structureType == STRUCTURE_EXTRACTOR }
            );
            intel.minerals_extr = (extractors.length == 1);
        }
        intel.deposits = null;
        if (deposits.length > 0) {
            intel.deposits = deposits[0].depositType;
            intel.deposits_cooldown = deposits[0].lastCooldown;
        }
        intel.threat = "none";
        if (invaderCores.length > 0) {
            intel.threat = "core";
        } else if (source_keeper.length > 0) {
            intel.threat = "keeper";
        }
        
        intel.ctrl = false;
        intel.ctrl_lvl = 0;
        if (room.controller) {
            intel.ctrl = true;
            intel.ctrl_lvl = room.controller.level;
            
            if (room.controller.owner) {
                intel.threat = "player";
                intel.owner = room.controller.owner.username;
                this.getDiplomatics(intel.owner);
                
                intel.has_spawn = false;
                var spawns = room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_SPAWN});
                if (spawns.length > 0) {
                    intel.has_spawn = true;
                }
                
                intel.has_towers = false;
                var towers = room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER});
                if (towers.length > 0) {
                    intel.has_towers = true;
                }
            }
        }
        
        intel.creeps = creeps.length;
        intel.structs = struct.length;
        
        //save intel
        if (Memory.intel.list[room.name]) delete Memory.intel.list[room.name];
        Memory.intel.list[room.name] = intel;
        
        //if room is in req, remove from req
        var index = Memory.intel.req.indexOf(room.name);
        if (index >= 0) {
            Memory.intel.req.splice(index, 1);
        }
        
        //potential new room?
        if (intel.ctrl && 
            (intel.threat == "none" || 
            (intel.threat == "player" && !intel.has_spawn)) &&
            intel.sources >= 2) 
        {
            this.addPotClaim(room.name);
        }
    }, 
    
    setDiplomatics: function(playername, status)
    {
        var index = _.findIndex(Memory.intel.diplo, (s) => s.player == playername);
        if (index >= 0) {
            Memory.intel.diplo[index] = {player: playername, status: status};
        } else {
            Memory.intel.diplo.push({player: playername, status: status});
        }
    }, 
    
    getDiplomatics: function(playername)
    {
        var index = _.findIndex(Memory.intel.diplo, (s) => s.player == playername);
        if (index >= 0) {
            return Memory.intel.diplo[index].status;
        } else {
            Memory.intel.diplo.push({player: playername, status: this.NEUTRAL});
            return this.NEUTRAL;
        }
    },
    
    addPotClaim: function(roomname)
    {
        if (!Memory.intel.claimable) {
            Memory.intel.claimable = [];
        }
        
        var index = _.findIndex(Memory.intel.claimable, (s) => s.room == roomname);
        if (index < 0) {
            var terrain = this.buildPotClaimTerrain(roomname);
            Memory.intel.claimable.push({room: roomname, parsed: false, terrain: terrain.serialize()});
        }
    }, 
    
    //build cost matrix based on terrain
    buildPotClaimTerrain: function(roomname)
    {
        var costs = new PathFinder.CostMatrix();
        const terrain = Game.map.getRoomTerrain(roomname);
        
        for (var x = 1; x <= 48; x++) {
            for (var y = 1; y <= 48; y++) {
                switch(terrain.get(x,y)) {
                    case TERRAIN_MASK_WALL:
                        costs.set(x, y, 255);
                        break;
                    case TERRAIN_MASK_SWAMP:
                        costs.set(x, y, 5);
                        break;
                }
            }
        }
        return costs;
    }, 
    
    
    getPotClaimCenterPos: function(roomname)
    {
        if (!Memory.intel) return undefined;
        if (!Memory.intel.claimable) return undefined;
        
        var index = _.findIndex(Memory.intel.claimable, (s) => s.room == roomname && s.parsed==true);
        if (index >= 0) {
            if (Memory.intel.claimable[index].parsed) {
                var center = Memory.intel.claimable[index].center;
                return new RoomPosition(center.x, center.y, roomname);
            }
        }
        
        return undefined;
    }, 
    
};