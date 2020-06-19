module.exports = {
	getName: function(room, role)
	{
		var baseName = role + "-#";
		var name = "";
		
		do {
			name = baseName + this.getRandomString(3);
		} while (Game.creeps[name]);
		
		return name;
	},
	
	getRandomString: function(length) {
	    var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	    var result = '';
	    for ( var i = 0; i < length; i++ ) {
	        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
	    }
	    return result;
	},
	
	pickupNearResource: function(creep)
	{
		let res = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
		if (res.length > 0) {
			creep.pickup(res[0]);
		}
	}, 
	
	
	pickEnergySource: function(creep) 
    {
	    //try to find half full containers
	    var c = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return ((structure.structureType == STRUCTURE_CONTAINER) &&
                    structure.store.getUsedCapacity(RESOURCE_ENERGY)/structure.store.getCapacity(RESOURCE_ENERGY) > 0.3) || 
					
                    ((structure.structureType == STRUCTURE_CONTAINER || 
					structure.structureType == STRUCTURE_STORAGE) && structure.pos.findInRange(FIND_SOURCES, 2).length == 0 && 
                    structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
            }
        });
        if (c)
        {
	        creep.memory.source = c.id;
	    } else {
		    var s = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, 
				{filter: (r) => r.resourceType == RESOURCE_ENERGY && r.amount >= 20});
		    if (s) {
		    	creep.memory.source = s.id;
		    }
	    }
    },
    
    
	goGetEnergyFromSource: function(creep)
	{	
		var source = Game.getObjectById(creep.memory.source);
        if (!source) { delete creep.memory.source; return; }
        
        if (source instanceof Resource) {
	        if(creep.pickup(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {range: 1, visualizePathStyle: {stroke: '#ff0000'}});
            }
        }
        else
        {
	        if(creep.withdraw(source, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {range: 1, visualizePathStyle: {stroke: '#ff0000'}});
            }
            
            //source empty - search other one
            if (source.store.getUsedCapacity(RESOURCE_ENERGY) == 0)
            {
	            delete creep.memory.source;
            }
        }
	},
	
	
	pickupDroppedEnergy: function(creep, range)
	{	
		if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
			
			var res = creep.pos.findInRange(FIND_DROPPED_RESOURCES, range);
			var ts = creep.pos.findInRange(FIND_TOMBSTONES, range);
			var ru = creep.pos.findInRange(FIND_RUINS, range);
				
			var targets = res.concat(ts).concat(ru);
			
			if (targets.length > 0) {
				var dist = creep.pos.getRangeTo(targets[0]);
				
				var amount = targets[0].amount || targets[0].store[RESOURCE_ENERGY];
				//console.log("amount: " + amount);
				
				//worth it?
				if (amount > 0 && amount > dist*10) 
				{
					//console.log("dropped res found - pickup");
					
					if (targets[0] instanceof Resource) {
						if (creep.pickup(targets[0]) == ERR_NOT_IN_RANGE) {
							creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ff0000'}});
						}
					} else {
						if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
							creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ff0000'}});
						}
					}
					
					return true;
					
				}
			}
		}
		
		return false;
	},
	
	
	buildBody: function(room, role, bodySize) {
		var body = [];
		
		var ntough = 0;
		var nwork = bodySize;
		var ncarry = bodySize;
		var nclaim = 0;
		var nmove = bodySize;
		var nattack = 0;
		var nrattack = 0;
		var nheal = 0;
		
		//statistics
		var ncontainer = room.find(FIND_STRUCTURES, {
	        filter: (structure) => {
	            return structure.structureType == STRUCTURE_CONTAINER;
	        }}).length;
			
		
		if (role=='miner')
		{
			bodySize = Math.min(bodySize, 6);
			nwork = Math.floor(1.5*bodySize);
			ncarry = Math.max(Math.floor(0.5*bodySize), 1);
			nmove = Math.max(Math.floor(0.5*bodySize), 1);
			
			//container miner
			if (ncontainer > 0 && bodySize == 1) {
				nwork = 2;
				ncarry = 1;
				nmove = 1;
			}
		} else 
		if (role=='hauler')
		{
			bodySize = Math.min(bodySize, 5);
			nwork=0;
			ncarry = Math.min(2*bodySize+1, 25);
			nmove = Math.min(2*bodySize-1, 25);
		} else 
		if (role=='upgrader') {
			bodySize = Math.min(bodySize, 5);
			nwork = bodySize;
			ncarry = bodySize;
			nmove = bodySize;
		} else 
		if (role == 'builder') {
			bodySize = Math.min(bodySize, 10);
			nwork = bodySize;
			ncarry = bodySize;
			nmove = bodySize;
		} else 
		if (role=='scout')
		{
			nwork=0;
			ncarry = 0;
			nmove = 1;
		} else 
		if (role == 'pioneer')
		{
			nwork=2;
			ncarry=4;
			nmove=6;
		} else 
		if (role == 'claimer')
		{
			nwork=0;
			ncarry=0;
			nclaim=1;
			nmove=1;
		} else 
		if (role == 'reserver')
		{
			nwork=0;
			ncarry=0;
			nclaim=Math.max(Math.round(bodySize/2), 1);
			nmove=1;
		} else 
		if (role == 'soldier')
		{
			if (bodySize > 2) {
				bodySize = Math.min(bodySize, 8);
				nwork=0;
				ncarry=0;
				ntough=bodySize; //10
				nmove=2*bodySize+1; //50
				nrattack=bodySize; //80
				nheal=1; // 250
			} else {
				nwork=0;
				ncarry=0;
				ntough=bodySize;
				nmove=2*bodySize;
				nrattack=bodySize;
			}
		} else 
		if (role == 'drainer')
		{
			bodySize = Math.min(bodySize, 16);
			nwork=0;
			ncarry=0;
			ntough=bodySize*2;//29; //10
			nmove=Math.round(bodySize*2.5);//17; //50
			nheal=Math.round(bodySize*0.5);//4; // 250
		} else
		if (role == 'dismantler')
		{
			ncarry=0;
			
			bodySize = Math.min(bodySize, 10);
			
			
			ntough=bodySize; //10
			nwork=Math.round(0.5*bodySize); // 100
			nrattack=Math.round(0.5*bodySize);
			nmove=Math.ceil(2.5*bodySize);//17; //50
			nheal=Math.round(0.5*bodySize);//4; // 250
		} else 
		if (role == 'harvester')
		{
			bodySize = Math.min(bodySize, 16);
			nwork=Math.ceil(0.5*bodySize);
			ncarry=bodySize;
			nmove=Math.ceil(1.5*bodySize);
		} else 
		if (role == 'healer')
		{
			bodySize = Math.min(bodySize, 25);
			nwork = 0;
			ncarry = 0;
			nmove= bodySize; //50
			nheal = bodySize; //250
		} else 
		if (role == 'groupTest')
		{
			nwork=0;
			ncarry=0;
			nmove=1;
		} else 
		if (role == 'queen')
		{
			nwork=0;
			ncarry=2;
			nmove=1;
		}
		//upgrader && builder == standard
		
		
		//max 50 body parts - reducing
		if (nwork + ncarry + nmove > 50)
		{
			var above = nwork + ncarry + nmove - 50;
			nwork -= Math.ceil(nwork/50*above);
			ncarry -= Math.ceil(ncarry/50*above);
			nmove -= Math.ceil(nmove/50*above);
		}
		
		
		//Tough
		for (var h=0; h < ntough; h++)
		{
			body.push(TOUGH);
		}
		
		//WORK
		for (var i=0; i<nwork; i++)
		{
			body.push(WORK);
		}
		
		//CARRY
		for (var j=0; j<ncarry; j++)
		{
			body.push(CARRY);
		}
		
		//CLAIM
		for (var k=0; k < nclaim; k++) {
			body.push(CLAIM);
		}
		
		//MOVE
		for (var l=0; l<nmove; l++)
		{
			body.push(MOVE);
		}
		
		//attack
		for (var m=0; m<nattack; m++)
		{
			body.push(ATTACK);
		}
		
		//ranged attack
		for (var n=0; n<nrattack; n++)
		{
			body.push(RANGED_ATTACK);
		}
		
		//heal
		for (var o=0; o<nheal; o++)
		{
			body.push(HEAL);
		}
		
		
		return body;
	}, 
	
	getSuitableBodySize: function(role, availableEnergy) {
		var size = Math.floor(availableEnergy/400);
		size = Math.max(size, 1);
		
		if (availableEnergy >= 500 && availableEnergy <= 800)
		{
			size = 2;
		}
		
		return size;
	}, 
	
	//get equivalent body size considering boosts
	getCreepBodyStrength: function(creep) {
		var bodySize = 0;
		for (var i in creep.body) 
		{
			var add = 1;
			if (creep.body[i].boost) {
				var effect = BOOSTS[creep.body[i].type][creep.body[i].boost];
				add *= effect[Object.keys(effect)[0]];
			}
			bodySize += add;
		}
		return bodySize;
	}, 
	
	getSpawnLink: function(room) {
        var cpoint = moduleAutobuilder.getBaseCenterPoint(room);
        var spawnlink = cpoint.findInRange(FIND_STRUCTURES, 2, {
	        filter: (structure) => {
	            return (structure.structureType == STRUCTURE_LINK);
	        }});
        if (spawnlink.length > 0) {
            return spawnlink[0];
        }
        
        return false;
    },
	
	sendLinkToSpawn: function(link) 
    {
		if (link.cooldown > 0) return false;
        var spawnlink = this.getSpawnLink(link.room);
        if (spawnlink) 
        {
            //spawnlink has full capacity
            if (spawnlink.store.getFreeCapacity(RESOURCE_ENERGY) == LINK_CAPACITY)
            {
                if (link.transferEnergy(spawnlink) == OK) 
				{
					return true;
				}
            }
        }
        return false;
    }, 
	
	skipDueEnergyLevels: function(creep) {
		//no skipping if room is attacked
		if (creep.room.memory.attacked_time + 30 > Game.time) {
			return false;
		}
		
		
        var energy = creep.room.memory.stats.energy;
        var cap = creep.room.memory.stats.capacity;
        var ratio = energy / cap;
        
        if (cap > 800 && ratio <= 0.05)
        {
            creep.say("😴");
			creep.moveTo(creep.room.controller);
            return true;
        }
        return false;
    }, 
	
	
	roomCostCallback: function(rname, fromRoomName)
	{
		//room status not equal - blocked
		var fstatus = Game.map.getRoomStatus(fromRoomName);
		var tstatus = Game.map.getRoomStatus(rname);
		if (fstatus.status != tstatus.status) {
			return Infinity;
		}
		
		var intel = Intel.getIntel(rname);
		if (intel) {
			
			if (intel.threat == "core" && intel.time+90000>Game.time || 
				intel.threat == "player" && (intel.has_towers || intel.creeps > 0) || 
				intel.blocked)
			{
				//avoid room
				return Infinity;
			}
		}
		return 1;
	}, 
	
	//source callback avoiding source keepers
	travelCostCallback: function(rname, costs)
	{
		var room = Game.rooms[rname];
		
		//room not found
		if (!room) return;
		
		//no hostiles - return
		if (room.find(FIND_HOSTILE_STRUCTURES).length <= 0) return;
		
		var sources = room.find(FIND_SOURCES);
		var minerals = room.find(FIND_MINERALS);
		var avoids = [].concat(sources, minerals);
		
		_.forEach(avoids, function(avoid){
			var xStart = avoid.pos.x - 4;
			var xEnd = avoid.pos.x + 4;
			var yStart = avoid.pos.y - 4;
			var yEnd = avoid.pos.y + 4;

			for(var x = xStart; x <= xEnd; x++) {
				for(var y = yStart; y <= yEnd; y++) {
					costs.set(x, y, 10);
				}
			}
		});

	}, 
	
	//moves creep to room name, avoids source keeper
	moveToRoom: function(creep, name) {		
		//follow room list
		if (!creep.memory.roomPath || 
			creep.memory.roomPathTarget != name)
		{
			var rlist = Game.map.findRoute(creep.room.name, name, {
				routeCallback: this.roomCostCallback
			});
			
			creep.memory.roomPath = rlist;
			creep.memory.roomPathTarget = name;
		}
		
		if (creep.memory.roomPath && creep.memory.roomPath[0])
		{
			if (creep.memory.roomPath[0].room == creep.room.name) {
				creep.memory.roomPath.shift();
			}
		}
		
		var nextRoom = name;
		if (creep.memory.roomPath && creep.memory.roomPath[0])
		{
			nextRoom = creep.memory.roomPath[0].room;
		}
		
        var pos = new RoomPosition(25, 25, nextRoom);
		
		var ret = creep.moveTo(pos, {
			reusePath: 50,
			costCallback: this.travelCostCallback,
			range: 5,
			plainCost: 1,
			swampCost: 3,
			maxOps: 4000,
			visualizePathStyle: {stroke: '#ffff00'}
		});
		
		
		if (ret == ERR_NO_PATH) {
			creep.moveTo(creep.room.getPositionAt(25, 25), {range: 5});
			
			//mark room as blocked if walls exist
			var r = creep.room.name;
			var walls = creep.room.find(
				FIND_STRUCTURES, 
				{filter: (s) => s.structureType == STRUCTURE_WALL}
			);
			
			if (walls.length > 0 && Memory.intel.list[r] && !Memory.intel.list[r].blocked) {
				Memory.intel.list[r].blocked = true;
				let msg = creep.name + ": couldnt find way through room " + creep.room.name + " and marked as blocked";
				Game.notify(msg);
				console.log(msg);
				
				delete creep.memory.roomPath;
			}
		}
    }, 
	
	init: function(creep) {
		//set home
        if (!creep.memory.home) {
            creep.memory.home = creep.room.name;
        }
	}, 
	
	getStoredResourceTypes: function(store) {
		if (!store) return [];
		return _.filter(Object.keys(store), resource => store[resource] > 0);
	}, 
	
	
	prepareCreep: function(creep)
    {
		//creep is not home - reset prepare
		if (creep.room.name != creep.memory.home) {
			creep.memory.embark = true;
			return false;
		}
		
		
        //renew creeps
        var spawns = creep.room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_SPAWN});

        if (spawns.length > 0)
        {
            var xx = spawns[0].renewCreep(creep);
            if (xx == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawns[0], {range: 1, visualizePathStyle: {stroke: '#0000ff'}});
            } else if (xx == ERR_FULL) {
				creep.memory.embark = true;
				return true;
			}
        }
		return false;
    }, 
	
	
	findBoostRes: function(boost) {
		var boost_res = [];
		
		for (var w in BOOSTS) {
			for (var res in BOOSTS[w]) {
				if (BOOSTS[w][res][boost]) {
					boost_res.push(res);
				}
			}
		}
		
		return boost_res.reverse();
	}, 
	
	//find labs to boost creep
	boostCreep: function(creep, boosts)
	{
		var found_labs = false;
		
		for(var boost of boosts) 
		{
			var res_array = this.findBoostRes(boost);
			for (var res of res_array) 
			{
				var amt = Labs.Boost.calcDemand(creep, res);
				var lab = Labs.Boost.findBoostLab(creep.room, res, amt);
				if (lab) {
					found_labs = true;
					if (!creep.memory.boostLabs) {
						creep.memory.boostLabs = [];
					}
					creep.memory.boostLabs.push(lab.id);
					break;
				}
			}
		}
		
		if (found_labs) {
			creep.memory.boostSelf = true;
		}
		return found_labs;
	}, 
	
	flee: function(creep)
	{
		//drop energy and flee to next tower
		
	}, 
	
	calcTankDps: function(creep)
	{
		
	}
};