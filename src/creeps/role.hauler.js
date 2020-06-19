
/*
Memory Layout
.role = "hauler"
.pickup = true/false
.renewSelf = true/false
.task = HAULING TASK
.target = target.id
*/

module.exports = {
	name: 'hauler', 
	run: function(creep) {
		baseCreep.init(creep);
		
		if (!creep.memory.tasks) {
			creep.memory.tasks = [];
			creep.memory.noRenew = true; //no autorenew
		}
		
		//check previous pickup amount
		this.checkPickup(creep);
				
		if (creep.memory.tasks.length == 0) 
		{
			if (creep.store.getUsedCapacity() > 0) {
				this.confusionDropoff(creep);
				return;
			}
			if (creep.ticksToLive < 200) {
				creep.memory.renewSelf = true;
				return;
			}
            creep.memory.pickup = true;
			
			//pick new task
			creep.memory.tasks = Logistics.getNewTasks(Game.rooms[creep.memory.home], creep.store.getCapacity());
			creep.memory.task_ptr = 0;
        }
		
        
		if (creep.memory.tasks.length > 0) 
		{
			var taskmem = creep.memory.tasks[creep.memory.task_ptr];
			var task = Logistics.getTask(Game.rooms[creep.memory.home], taskmem.id);
			
			if (!task) {
				this.removeTask(creep, taskmem.id);
				this.processTaskProgress(creep);
				return;
			}
			
			//has task - do things
	        if (creep.memory.pickup)
	        {
		        this.pickup(creep, task, taskmem);
	        } 
	        else 
	        {
				this.dropoff(creep, task, taskmem);
		    }
		} 
		else 
		{
			//no task, idle
		}
	}, 
	
	pickup: function(creep, task, taskmem) 
	{
		//source is available check
		var s = Game.getObjectById(task.src);
		if (!s) { 
			//console.log(creep.room.name + " " + creep.name + ": source invalid, delete task");
			//console.log(JSON.stringify(task));
			Logistics.deleteTask(Game.rooms[creep.memory.home], task.id);
			this.removeTask(creep, task.id);
			this.processTaskProgress(creep);
			return; 
		}
		
		//travel to room
		if (s.room.name != creep.room.name) {
			baseCreep.moveToRoom(creep, s.room.name);
			return;
		}
		
		//select resource for pickup
		var resource = task.res || RESOURCE_ENERGY;
		var amount_avbl = s.amount || s.store[resource];
		var storage_avbl = creep.store.getFreeCapacity();
		var amount = Math.min(amount_avbl, storage_avbl, taskmem.vol);
		
		var ret = null;
		if (s instanceof Resource){
			ret = creep.pickup(s);
		} else {
			ret = creep.withdraw(s, resource, amount);
		}
		//creep.say("p: " + ret);

		if (ret  == ERR_NOT_IN_RANGE) {
			creep.moveTo(s, {visualizePathStyle: {stroke: '#ff0000'}});
		}
		
		
		//successful
		if (ret == OK || ret == ERR_FULL) {
			taskmem.utx += amount;
			Logistics.markPickup(Game.rooms[creep.memory.home], task.id, taskmem.vol, amount);
			this.nextTask(creep);
			this.savePickup(creep, amount, task.id);

			//creep will be full - switch to dropoff
			if (amount >= storage_avbl) 
			{
				creep.memory.pickup = false;
				this.cancelAllOpenTasks(creep);
			}
		}
		
		//Err - task invalid, not enough resources for transport
		if (ret == ERR_NOT_ENOUGH_RESOURCES || ret == ERR_INVALID_TARGET) {
			if (amount_avbl == 0) {
				//wait one tick for res to arrive
				if (task.created_at == Game.time) {
					return;
				}
				
				Logistics.deleteTask(Game.rooms[creep.memory.home], task.id);
				
				this.removeTask(creep, task.id);
				this.processTaskProgress(creep);
				//console.log(creep.room.name + " " + creep.name + ": wrong numbers, deleted task " + task.type);
			}
		}
	}, 
	
	
	dropoff: function(creep, task, taskmem) 
	{
		//move to home room for dropoff
		if (creep.room.name != creep.memory.home) {
			baseCreep.moveToRoom(creep, creep.memory.home);
			return;
		}
		
		//pick energy receiver
		if (!creep.memory.target) {
			this.pickReceiver(creep, task);
		}
		
		
		var target = Game.getObjectById(creep.memory.target);
		if (target) 
		{
			//select resource for transfer
			var resource = task.res || RESOURCE_ENERGY;
			var amount_avbl = creep.store[resource];
			var storage_avbl = target.store.getFreeCapacity(resource);
			var amount = Math.min(amount_avbl, storage_avbl, taskmem.utx);
			
			//go to target and transfer
			var ret = creep.transfer(target, resource, amount);
			//creep.say("d: " + ret);
			
			if(ret == ERR_NOT_IN_RANGE) {
				creep.moveTo(target, {visualizePathStyle: {stroke: '#00ff00'}});
			}
			
			//target full - search new target
			if (storage_avbl == 0 || ret == ERR_INVALID_TARGET) {
				delete creep.memory.target;
			}
			
			//transfer complete - search new target
			if (ret == OK) 
			{
				Logistics.markDropoff(Game.rooms[creep.memory.home], task.id, amount);
				delete creep.memory.target;
				
				if (task.rec != null) {
					this.removeTask(creep, task.id);
				}
				
				//creep will be empty in next tick
				if (amount >= creep.store.getUsedCapacity()) {
					creep.memory.pickup = true;
					creep.memory.tasks = [];
					//console.log(creep.room.name + " " + creep.name + ": Creep empty, looking for new tasks");
				}
			}
		}
		else 
		{
			//delete just in case
			delete creep.memory.target;
			
			//no free capacity - just walk to spawn and wait
			var spawn = creep.room.find(FIND_STRUCTURES, {
				filter: (structure) => {
					return (structure.structureType == STRUCTURE_SPAWN);
				}
			});
			if (spawn.length > 0)
			{
				creep.moveTo(spawn[0], {visualizePathStyle: {stroke: '#00ff00'}});
			}
			creep.say("??");
			
		}
	}, 


	pickReceiver: function(creep, task) {
		//first pick task receiver
		let taskrec = Game.getObjectById(task.rec);
		if (taskrec) {
			if (taskrec.store.getFreeCapacity(task.res) > 0) {
				creep.memory.target = taskrec.id;
				return;
			}
		}
		
		
		var target = null;
		
		if (task.res == RESOURCE_ENERGY) 
		{
			//CARRY ENERGY TO PRIORITY TARGETS
			// Prio 1: SPAWNS, Extensions
			if (!target) {
				target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_EXTENSION ||
							structure.structureType == STRUCTURE_SPAWN) &&
							structure.store.getFreeCapacity(task.res) > 0;
					}
				});
			}
			
			//prio 2: towers
			if (!target) {
				target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_TOWER && 
							structure.store.getFreeCapacity(task.res) > 50);
					}
				});
			}
			
			//prio 3: containers, Storage
			if (!target) {
				target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_STORAGE || 
							(structure.structureType == STRUCTURE_CONTAINER && structure.pos.findInRange(FIND_SOURCES, 2).length == 0 && 
							structure.pos.findInRange(FIND_MINERALS, 2).length == 0)) &&
							structure.store.getFreeCapacity(task.res) > 0;
					}
				});
			}
				
		} 
		else //OTHER RESOURCES
		{
			//CARRY ANY OTHER RESOURCE TO TERMINAL
			if (!target) {
				target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_TERMINAL &&
							structure.store.getFreeCapacity(task.res) > 0);
					}
				});
			}
			
			//or else to storages
			if (!target) {
				target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_STORAGE || 
							(structure.structureType == STRUCTURE_CONTAINER && structure.pos.findInRange(FIND_SOURCES, 2).length == 0 && 
							structure.pos.findInRange(FIND_MINERALS, 2).length == 0)) &&
							structure.store.getFreeCapacity(task.res) > 0;
					}
				});
			}
		}
		
		if(target) {
			creep.memory.target = target.id
		}
	}, 
	
	removeTask: function(creep, taskid)
	{
		var index = _.findIndex(creep.memory.tasks, (s) => s.id == taskid);
		if (index >= 0) {
			creep.memory.tasks.splice(index, 1);
		}
	}, 
	
	nextTask: function(creep)
	{
		creep.memory.task_ptr++;
		this.processTaskProgress(creep);
	},
	
	processTaskProgress: function(creep)
	{
		if (creep.memory.task_ptr >= creep.memory.tasks.length) {
			creep.memory.pickup = !creep.memory.pickup;
			creep.memory.task_ptr = 0;
		}
	}, 
	
	getTaskMem: function(creep, taskid)
	{
		var index = _.findIndex(creep.memory.tasks, (s) => s.id == taskid);
		if (index >= 0) {
			return creep.memory.tasks[index];
		}
		return undefined;
	}, 
	
	cancelAllOpenTasks: function(creep)
	{
		for (var i in creep.memory.tasks) {
			var taskmem = creep.memory.tasks[i];
			
			//all tasks not started
			if (taskmem.vol > 0 && taskmem.utx == 0)
			{
				Logistics.markCancel(Game.rooms[creep.memory.home], taskmem.id, taskmem.vol);
				taskmem.vol = 0;
			}
		}
		
		this.removeEmptyTasks(creep);
	}, 
	
	removeEmptyTasks: function(creep)
	{
		_.remove(creep.memory.tasks, (s) => s.vol == 0 && s.utx == 0);
	}, 
	
	
	confusionDropoff: function(creep)
	{
		var target = creep.room.storage || creep.room.terminal;
		var res_types = baseCreep.getStoredResourceTypes(creep.store);
		if (target) {
			creep.transfer(target, res_types[0]);
			creep.moveTo(target);
			return;
		}
		
		//look for other places - spawn or extensions
		var targets = creep.room.find(FIND_STRUCTURES, 
			{filter: (s) => (s.structureType == STRUCTURE_CONTAINER || 
				s.structureType == STRUCTURE_SPAWN || 
				s.structureType == STRUCTURE_EXTENSION) && 
				s.store.getFreeCapacity(res_types[0]) > 0
			}
		);
		
		if (targets.length > 0) {
			creep.transfer(targets[0], res_types[0]);
			creep.moveTo(targets[0]);
		}
	},
	
	savePickup: function(creep, amount, taskid)
	{
		creep.memory.previous_storage = creep.store.getUsedCapacity();
		creep.memory.previous_amount = amount;
		creep.memory.previous_taskid = taskid;
	}, 
	
	checkPickup: function(creep)
	{
		if (!creep.memory.previous_taskid) return;
		
		var used_store = creep.store.getUsedCapacity();
		var used_before = creep.memory.previous_storage;
		var should_amount = creep.memory.previous_amount;
		var is_amount = used_store - used_before;
		
		if (is_amount != should_amount) {
			//console.log(creep.room.name + " " + creep.name + ": Pickup Check detected wrong pickup");
			var taskid = creep.memory.previous_taskid;
			var task = Logistics.getTask(Game.rooms[creep.memory.home], taskid);
			var taskmem = this.getTaskMem(creep, taskid);
			var delta = is_amount - should_amount;
			
			if (taskmem) {
				taskmem.utx += delta;
			}
			if (task) {
				task.utx += delta;
			}
		}
		
		delete creep.memory.previous_storage;
		delete creep.memory.previous_amount;
		delete creep.memory.previous_taskid;
		
	},
	
	
	
};