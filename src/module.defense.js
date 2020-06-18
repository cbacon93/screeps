module.exports = {
	run: function(room)
	{
		//defense list
		this.memCleanup(room);
		this.buildHostileList(room);
		
		
		
		var towers = room.find(FIND_MY_STRUCTURES, {
			filter: { structureType: STRUCTURE_TOWER }
		});
		
		
		//towers shooting
		this.towers(room, towers);

		
		
		//AUTO SAFEMODE
		var hostiles = room.find(
			FIND_HOSTILE_CREEPS, 
			{filter: (s) => Intel.getDiplomatics(s.owner.username) != Intel.FRIEND}
		);
		
		if (hostiles.length > 0)
		{
			room.memory.attacked_time = Game.time;
			
			//check if hostiles are near creeps or structures
			for (var i=0; i < hostiles.length; i++)
			{
				
				var ncreeps = hostiles[i].pos.findInRange(FIND_MY_CREEPS, 4).length;
				var nconstr = hostiles[i].pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 4).length;
				var nstruct = hostiles[i].pos.findInRange(FIND_STRUCTURES, 4).length;
				
				var cstrength = baseCreep.getCreepBodyStrength(hostiles[i]);
				
				//activate safe mode if more then 3 hostiles or no towers
				if (ncreeps+nconstr+nstruct > 0 && 
					(hostiles.length > 3 || towers.length == 0) || 
					cstrength > 100)
				{
					//try activate safe mode
					//console.log("danger!");
					if (!room.controller.safeMode && false) {
						if (room.controller.activateSafeMode() == OK)
						{
							let msg = room.name + ": Hostiles detected! Safe mode activated!";
							Game.notify(msg);
							console.log(msg);
						} else {
							let msg = room.name + ": Hostiles detected! Safe mode failed!";
							Game.notify(msg);
							console.log(msg);
						}
					}
					
					break;
				}
			}
			
			
			//autospawn a soldier
			var soldier = _.find(Memory.creeps, (s) => s.role == "soldier" && s.troom == room.name);
			if (!soldier && false) {
				var index = _.findIndex(room.memory.spawnList, (s) => s.role == "soldier");
				if (index < 0) {
					moduleSpawn.addSpawnList(room, "soldier", {troom: room.name, grp: "defend", embark: true, killSelf: true});
				}
			}
		} 
		
		
		
		// SPAWN ROOM LIFETIME OPS
		if (Game.time % 100 == 0) {
			var index = _.findIndex(
				Memory.ops, (s) => 
				{ return s.type == "room_lifetime" && s.source == room.name; }
			);
			if (index < 0) {
				Ops.new("room_lifetime", room.name, "");
			}
		}
		
		
		//calc wall hp
		if (room.controller.level == 4) {
			room.memory.walls = 50000;
		} else if (room.controller.level == 5) {
			room.memory.walls = 100000;
		} else if (room.controller.level == 6) {
			room.memory.walls = 500000;
		} else if (room.controller.level == 7) {
			room.memory.walls = 1000000;
		} else if (room.controller.level == 8) {
			room.memory.walls = 10000000;
		}
		
		
	},
	
	
	towers: function(room, towers)
	{
		//shoot hostiles
		var shooters = _.filter(room.memory.hostiles, (h) => h.shoot == true);
		if (shooters.length > 0) {
			var hostile = Game.getObjectById(shooters[0].creep);
	        if (hostile) {
				for(let tower of towers)
				{
	            	tower.attack(hostile);
				}
				return;
	        }
		}
		
		//heal creeps
		var injured = room.find(FIND_MY_CREEPS, {filter: (s) => (s.hits < s.hitsMax) });
		if (injured.length > 0) {
			for(let tower of towers)
			{
				tower.heal(injured[0]);
			}
			return;
		}
		
		
		
			
		//repair structures except walls below 10k hps
		var structures = room.find(FIND_STRUCTURES, {
            filter: (s) => s.hits < s.hitsMax && (
			s.structureType != STRUCTURE_WALL && 
			s.structureType != STRUCTURE_RAMPART || 
			s.hits < 10000)
        });
        if(structures.length > 0) {
			for(let tower of towers)
			{
				if (tower.store[RESOURCE_ENERGY] > tower.store.getCapacity(RESOURCE_ENERGY)/2) {
					tower.repair(structures[0]);
				}					
			}
			return;
        }
	}, 
	
	
	buildHostileList: function(room)
	{
		if (!room.memory.hostiles) {
			room.memory.hostiles = [];
		}
		
		var hostiles = room.find(FIND_HOSTILE_CREEPS);
		
		//maybe filter out friendlies
		
		for (var h of hostiles) 
		{
			var bparts = _.countBy(h.body, 'type');
			
			//friendlies
			if (Intel.getDiplomatics(h.owner.username) == Intel.FRIEND) {
				continue;
			}
			
			//AI Hostiles
			if (h.owner.username == "Invader") {
				this.addToHostileList(room, 5, h.id, "Invader");
				this.enableShoot(room, h.id);
			}
			
			//non-offensive-creeps
			if (!bparts[WORK] && !bparts[ATTACK] && !bparts[RANGED_ATTACK] && !bparts[CLAIM]) {
				if (bparts[HEAL] && bparts[HEAL] > 0) {
					//healer? drainer?
					this.addToHostileList(room, 6, h.id, "healer");
					let nearcreeps = h.pos.findInRange(FIND_MY_CREEPS, 4);
					let nearstructs = h.pos.findInRange(FIND_STRUCTURES, 4);
					if (nearcreeps.length > 0 || nearstructs.length > 0) {
						this.enableShoot(room, h.id);
					}
					
					continue;
				} else 
				if (bparts[CARRY] && bparts[CARRY] > 0) {
					//scooper? - shoot when close
					this.addToHostileList(room, 4, h.id, "scooper");
					let nearcreeps = h.pos.findInRange(FIND_MY_CREEPS, 2);
					let nearstructs = h.pos.findInRange(FIND_STRUCTURES, 2);
					if (nearcreeps.length > 0 || nearstructs.length > 0) {
						this.enableShoot(room, h.id);
					}
					
					continue;
				}
				//scout
			}
			else {
				//dangerous creep
				this.addToHostileList(room, 5, h.id, "attacker");
				let nearcreeps = h.pos.findInRange(FIND_MY_CREEPS, 3);
				let nearstructs = h.pos.findInRange(FIND_STRUCTURES, 3);
				if (nearcreeps.length > 0 || nearstructs.length > 0) {
					this.enableShoot(room, h.id);
				}
				
				continue;
			}
		}
		
	},
	
	addToHostileList: function(room, prio, creepid, role, shoot=false)
	{
		var index = _.findIndex(room.memory.hostiles, (c) => c.creep == creepid);
		if (index < 0) {
			room.memory.hostiles.push({prio: prio, creep: creepid, role: role, shoot: shoot});
		}
	}, 
	
	enableShoot: function(room, creepid)
	{
		var index = _.findIndex(room.memory.hostiles, (c) => c.creep == creepid);
		if (index >= 0) {
			room.memory.hostiles[index].shoot = true;
		}
	}, 
	
	
	memCleanup: function(room)
	{
		for (var i in room.memory.hostiles)
		{
			var c = Game.getObjectById(room.memory.hostiles[i].creep);
			if (!c || c.room.name != room.name) {
				room.memory.hostiles.splice(i, 1);
				return;
			}
		}
	}, 
	
	
	getSummedDistanceFromTowers: function(pos, room)
	{
		var towers = room.find(FIND_MY_STRUCTURES, {
			filter: { structureType: STRUCTURE_TOWER }
		});
		
		var ret = 0;
		for (var t of towers) {
			ret += t.pos.getRangeTo(t.pos);
		}
		
		return ret;
	}
};