/*
Memory Layout
role = 'soldier'
home = home room name
grp = group.id
grp_lead = creep.id / 'self'
grp_follow = [creep ids of follower]

troom = room name to start attack
tx = xcord of target
ty = ycord of target
trange = range of targets at pos

target - object id of attack target
passive = false

attacked_time = 0;
*/

module.exports = {
    name: 'soldier', 
    boost: ['damage', 'rangedAttack'], 
    run: function(creep) {
        baseCreep.init(creep);
        
        var leader = baseGroup.getLeader(creep);
        
        this.attackDetection(creep, leader);
        this.healSelf(creep);
        
        if (creep.memory.grp_lead == 'self')
        {
            creep.say('⭐');
            this.leader(creep);
        } else {
            this.sheep(creep, leader);
        }
        
    }, 
    
    
    sheep: function(creep, leader)
    {
        //copy leader memory
        creep.memory.grp_follow = leader.memory.grp_follow;
        creep.memory.troom = leader.memory.troom;
        creep.memory.tx = leader.memory.tx;
        creep.memory.ty = leader.memory.ty;
        creep.memory.trage = leader.memory.trange;
        creep.memory.target = leader.memory.target;
        creep.memory.passive = leader.memory.passive;
        
        //shoot at target
        if (leader.memory.target) 
        {
            var target = Game.getObjectById(leader.memory.target);
            if (target)
            {
                this.attack(creep, target);
                return;
            }
        }
        
        //if target room - prepare for embarkation
        if (creep.memory.troom && !creep.memory.embark) {
            if (baseCreep.prepareCreep(creep)) {
                //prepared - search for boost
                creep.memory.noRenew = true;
                baseCreep.boostCreep(creep, this.boost);
            }
            return;
        } else if (!creep.memory.troom) {
            delete creep.memory.embark;
            delete creep.memory.noRenew;
        }
        
        //follow leader
        creep.moveTo(leader, {range: 1});
    }, 
    
    leader: function(creep)
    {
        //target
        if (creep.memory.target) {
            var target = Game.getObjectById(creep.memory.target);
            if (target) {
                this.attack(creep, target);
                return;
            } else {
                delete creep.memory.target;
            }
        }
        
        //no target room - go home
        if (!creep.memory.troom) 
        {
            if (creep.room.name != creep.memory.home) {
                baseCreep.moveToRoom(creep, creep.memory.home);
            }
            else 
            {
                //idle around controller
                creep.say("😴");
                creep.moveTo(creep.room.controller);
                this.pickTarget(creep);
            }
            delete creep.memory.noRenew;
            delete creep.memory.embark;
            return;
        }
        
        
        //if target room - prepare for embarkation
        if (!creep.memory.embark) {
            if (baseCreep.prepareCreep(creep)) {
                //prepared - search for boost
                creep.memory.noRenew = true;
                baseCreep.boostCreep(creep, this.boost_res);
            }
            return;
        }
        
        
        //collect intel        
        Intel.collectIntel(creep, creep.room);
        
        
        //in target room
        if (creep.room.name == creep.memory.troom) 
        {
            //search for targets in room
            if (!creep.memory.target && !creep.memory.passive) 
            {
                var tposition = null;
                var trange = -1;
                if (creep.memory.tx && creep.memory.ty) {
                    tposition = creep.room.getPositionAt(creep.memory.tx, creep.memory.ty);
                }
                if (creep.memory.trange) {
                    trange = creep.memory.trange;
                }
                
                this.pickTarget(creep, tposition, trange);
            }
            
            //move in position
            if (creep.memory.tx && creep.memory.ty) 
            {
                creep.moveTo(creep.memory.tx, creep.memory.ty);
                creep.say("🛡️");
            }
        } 
        else 
        {   //move to target room
            
            //handle counter attack on the way
            if (creep.memory.attacked_time + 10 > Game.time) {
                if (!creep.memory.target && !creep.memory.passive) 
                {   //pick closest target
                    this.pickTarget(creep);
                }
            }
            
            //wait for fellow creeps
            var follower = creep.pos.findInRange(FIND_MY_CREEPS, 1).length;
            if (creep.memory.grp_follow && follower-1 < creep.memory.grp_follow.length) {
                baseGroup.checkFollower(creep);
                creep.say("Zzz");
                return; //waiting
            }
            
            //move
            baseCreep.moveToRoom(creep, creep.memory.troom);
        }
    }, 
    
    attack: function(creep, target)
    {
        creep.say("⚔️");
        
        /*var ret = creep.attack(target);
        if (ret == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
        }*/
        creep.rangedMassAttack();
        creep.moveTo(target, {range: 1, visualizePathStyle: {stroke: '#ff0000'}});
    }, 
    
    pickTarget: function(creep, findAtPos = null, range = -1)
    {
        if (!findAtPos) {
            findAtPos = creep.pos;
        }
        
        var hostiles = null;
        var structures = null;
        
        if (range <= 0) {
            hostiles = findAtPos.findClosestByPath(FIND_HOSTILE_CREEPS, {filter: (s) => Intel.getDiplomatics(s.owner.username) != Intel.FRIEND});
            structure = findAtPos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {
                filter: (s)=>(s.structureType == STRUCTURE_TOWER || 
                    s.structureType == STRUCTURE_SPAWN) && 
                    Intel.getDiplomatics(s.owner.username) != Intel.FRIEND});
        } else {
            hostiles = findAtPos.findInRange(FIND_HOSTILE_CREEPS, range, {filter: (s) => Intel.getDiplomatics(s.owner.username) != Intel.FRIEND});
            structure = findAtPos.findInRange(FIND_HOSTILE_STRUCTURES, range, {
                filter: (s)=>(s.structureType == STRUCTURE_TOWER || 
                    s.structureType == STRUCTURE_SPAWN) && 
                    Intel.getDiplomatics(s.owner.username) != Intel.FRIEND});
                
            if (hostiles.length > 0) {
                hostiles = hostiles[0];
            }
            if (structure.length > 0) {
                structure = structure[0];
            }
        }
        
        if (hostiles)
        {
            creep.memory.target = hostiles.id;
        } else if (structure) {
            creep.memory.target = structure.id;
        } else {
            //no targets - move home
            delete creep.memory.target;
            //delete creep.memory.troom;
        }
    }, 
    
    healSelf: function(creep)
    {
        //heal self function
        if (creep.hits < creep.hitsMax) {
            creep.heal(creep);
        } else {
            //heal others
            var targets = creep.pos.findInRange(FIND_MY_CREEPS, 1, {filter: (s) => s.hits < s.hitsMax });
            if (targets.length > 0) {
                creep.heal(targets[0]);
            }
        }
    }, 
    
    
    attackDetection: function(creep, leader)
    {
        // attacked timer is now autoset
        
        
        //tell leader
        if (creep.memory.attacked_time && leader) {
            if (creep.memory.attacked_time > leader.memory.attacked_time) {
                leader.memory.attacked_time = creep.memory.attacked_time;
            }
        }
        
    }, 
    
    
    
};