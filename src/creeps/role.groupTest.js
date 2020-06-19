// moduleSpawn.addSpawnList(Game.rooms.sim, "groupTest")


module.exports = {
    name: "groupTest",
    run: function(creep)
    {
        baseCreep.init(creep);
        var leader = baseGroup.getLeader(creep);
        
        
        if (leader.name == creep.name) 
        {
            //leader
            if (!creep.memory.target) {
                creep.memory.target = 0;
            }
            
            let targets = [ {x:5, y:5}, {x:45, y:5}, {x:45, y:45}, {x:5, y:45} ];
            let target = targets[creep.memory.target];
            
            let dist = creep.pos.getRangeTo(target.x, target.y);
            if (dist < 6) 
            {
                creep.memory.target++;
                if (creep.memory.target >= 4) {
                    creep.memory.target = 0;
                }
            }
            
            let rpos = creep.room.getPositionAt(target.x, target.y);
            baseGroup.moveLeader(creep, rpos, {range: 5, visualizePathStyle: {stroke: '#ffff00'}});
        } 
        else 
        {
            //sheep
            //var path = leader.memory._move.path;
            //creep.move(path.substr(0,1));
            creep.moveTo(leader.pos);
        }
    }
};