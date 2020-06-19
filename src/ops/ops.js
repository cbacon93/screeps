/*
Ops List
{type: 'scout', source: 'W3S16', target: 'W1S2', finished: false, mem: {}}

*/

const opsAttack = require('ops_ops.attack');
const opsClaim = require('ops_ops.claim');
const opsDefend = require('ops_ops.defend');
const opsDrain = require('ops_ops.drain');
const opsScout = require('ops_ops.scout');
const opsHarvest = require('ops_ops.harvest');
const opsScoutVicinity  = require('ops_ops.scout_vicinity');
const opsRoomLifetime = require('ops_ops.room_lifetime');

module.exports = {
    run: function() {
        if (!Memory.ops) {
            Memory.ops = [];
        }
        
        //remove finished
        _.remove(Memory.ops, (s) => s.finished == true);
        
        //run
        for(var i in Memory.ops) {
            if (Memory.ops[i].type == 'attack') {
                opsAttack.run(Memory.ops[i]);
            } else if (Memory.ops[i].type == 'claim') {
                opsClaim.run(Memory.ops[i]);
            } else if (Memory.ops[i].type == 'defend') {
                opsDefend.run(Memory.ops[i]);
            } else if (Memory.ops[i].type == 'drain') {
                opsDrain.run(Memory.ops[i]);
            } else if (Memory.ops[i].type == 'scout') {
                opsScout.run(Memory.ops[i]);
            } else if (Memory.ops[i].type == 'harvest') {
                opsHarvest.run(Memory.ops[i]);
            } else if (Memory.ops[i].type == 'scout_vicinity') {
                opsScoutVicinity.run(Memory.ops[i]);
            } else if (Memory.ops[i].type == 'room_lifetime') {
                opsRoomLifetime.run(Memory.ops[i]);
            }
        }
    }, 
    
    
    new: function(type, source, target, mem={}) 
    {
        if (!Memory.ops) {
            Memory.ops = [];
        }
        
        Memory.ops.push({type: type, source: source, target: target, finished: false, mem: mem});
    },
    
    
    checkSrcRoomAvbl: function(ops)
    {
        // SOURCE ROOM NOT AVBL - ABORT
        if (!Game.rooms[ops.source]) {
            console.log("Ops." + ops.type + ": Source room lost. Aborting");
            ops.finished = true;
            return true;
        }
        return false;
    }
};