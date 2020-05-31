global.baseCreep = require('creeps_baseCreep');
global.moduleLogistics = require('module.logistics');
global.moduleSpawn = require('module.spawn');
global.Ops = require('ops_ops');
global.Labs = require('labs_labs');
global.Terminal = require('module.terminal');

var roleMiner = require('creeps_role.miner');
var roleUpgrader = require('creeps_role.upgrader');
var roleBuilder = require('creeps_role.builder');
var roleHauler = require('creeps_role.hauler');
var roleScout = require('creeps_role.scout');
var rolePioneer = require('creeps_role.pioneer');
var roleClaimer = require('creeps_role.claimer');
var roleSoldier = require('creeps_role.soldier');
var roleDrainer = require('creeps_role.drainer');
var roleRenewSelf = require('creeps_role.renewSelf');
var roleBoostSelf = require('creeps_role.boostSelf');

var moduleStats = require('module.stats');
var moduleAutobuilder = require('module.autobuilder');
var moduleDefense = require('module.defense');

/*const profiler = require('screeps-profiler');
profiler.registerObject(baseCreep, 'baseCreep');
profiler.registerObject(moduleLogistics, 'moduleLogistics');
profiler.registerObject(moduleSpawn, 'moduleSpawn');
profiler.registerObject(moduleStrategy, 'moduleStrategy');
profiler.registerObject(roleMiner, 'roleMiner');
profiler.registerObject(roleUpgrader, 'roleUpgrader');
profiler.registerObject(roleBuilder, 'roleBuilder');
profiler.registerObject(roleRenewSelf, 'roleRenewSelf');
profiler.registerObject(roleHauler, 'roleHauler');
profiler.registerObject(roleScout, 'roleScout');
profiler.registerObject(rolePioneer, 'rolePioneer');
profiler.registerObject(roleClaimer, 'roleClaimer');
profiler.registerObject(roleSoldier, 'roleSoldier');
profiler.registerObject(moduleStats, 'moduleStats');
profiler.registerObject(moduleAutobuilder, 'moduleAutobuilder');
profiler.registerObject(moduleDefense, 'moduleDefense');*/

if (!MODE_SIMULATION) console.log("reset detected");

//profiler.enable();
module.exports.loop = function () {
    //profiler.wrap(function() {
        //MODULES per Room
        for (var sname in Game.spawns)
        {
            var spawn = Game.spawns[sname];
            moduleStats.run(spawn.room);
            
            if (Game.time % 10 == 0)
                moduleSpawn.run(spawn);
            if (Game.time % 20 == 1)
                moduleAutobuilder.run(spawn.room);
            if (spawn.room.terminal) {
                if (Game.time % 20 == 4)
                    Terminal.run(spawn.room);
            }
            
            Labs.run(spawn.room);
            moduleDefense.run(spawn.room);
            moduleLogistics.run(spawn.room);
        }
        
        //OPS
        Ops.run();
        
        //CREEPS
        for(var name in Game.creeps) {
            var creep = Game.creeps[name];
            
            //try {
                if (creep.memory.renewSelf) {
        	        roleRenewSelf.run(creep);
                } else if (creep.memory.boostSelf) {
                    roleBoostSelf.run(creep);
                } else if(creep.memory.role == 'miner') {
                    roleMiner.run(creep);
                } else if(creep.memory.role == 'upgrader') {
                    roleUpgrader.run(creep);
                } else if(creep.memory.role == 'builder') {
                    roleBuilder.run(creep);
                } else if(creep.memory.role == 'hauler') {
        	        roleHauler.run(creep);
                } else if (creep.memory.role == 'scout') {
                    roleScout.run(creep);
                } else if (creep.memory.role == 'pioneer') {
                    rolePioneer.run(creep);
                } else if (creep.memory.role == 'claimer') {
                   roleClaimer.run(creep);
                } else if (creep.memory.role == 'soldier') {
                   roleSoldier.run(creep);
               } else if (creep.memory.role == 'drainer') {
                   roleDrainer.run(creep);
                }
            /*}
            catch(err)
            {
                console.log(err.message);
            }*/
            
            if (creep.ticksToLive <= 100 && !creep.memory.noRenew)
            {
    	        creep.memory.renewSelf = true;
            }
        }
    //});
};
