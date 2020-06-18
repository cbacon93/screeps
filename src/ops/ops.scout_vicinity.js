module.exports = {
    scout_timeout: 100,
    recent_intel_skip: 3000,
    run: function(ops)
    {
        this.init(ops);
        
        // scouting finished
        if (ops.mem.nearby_id >= ops.mem.nearby.length) 
        {
            //scouting completed
            ops.finished = true;
            return;
        }
        
        //scout timeout
        if (ops.mem.scout_timeout + this.scout_timeout > Game.time) return;
        ops.mem.scout_timeout = Game.time;
        
        // SOURCE ROOM NOT AVBL - ABORT
        if (Ops.checkSrcRoomAvbl(ops)) return;
        
        this.sendScouts(ops);
    }, 
    
    
    sendScouts: function(ops)
    {
        var target = ops.mem.nearby[ops.mem.nearby_id];
        
        //skip own room scouting
        var room = Game.rooms[target];
        if (room && room.controller && room.controller.my) {
            ops.mem.nearby_id++;
            return;
        }
        
        //check recently scouted
        var intel = Intel.getIntel(target);
        if (intel && intel.time + this.recent_intel_skip > Game.time) {
            ops.mem.nearby_id++;
            return;
        }
        
        //start scout
        Ops.new("scout", ops.source, target);
        ops.mem.nearby_id++;
    }, 
    
    
    init: function(ops)
    {
        if (ops.mem.init) return;
        ops.mem.init = true;
        ops.mem.scout_timeout = 0;
        
        var room = Game.rooms[ops.source];
        var range = room.controller.level;
        if (ops.mem.range) {
            range = ops.mem.range;
        }
        
        ops.mem.nearby = this.getRoomsNearby(ops.source, range);
        ops.mem.nearby_id = 0;
    }, 
    
    getRoomsNearby: function(roomname, range)
    {
        if (range <= 0) return [];
        var exits = Game.map.describeExits(roomname);
        var rstatus = Game.map.getRoomStatus(roomname);
        var ret = [];
        
        //add rooms (Only add rooms with same room status)
        for(let i of Object.keys(exits)) {
            if (Game.map.getRoomStatus(exits[i]).status == rstatus.status) {
                ret.push(exits[i]); 
            }   
        }
        //add adjacent rooms of rooms (Only add rooms with same room status)
        for(let i of Object.keys(exits)) {
            if (Game.map.getRoomStatus(exits[i]).status == rstatus.status) {
                var rooms = this.getRoomsNearby(exits[i], range-1);
                ret = [].concat(ret, rooms);
            }
        }
        
        //remove doubles
        ret = [...new Set(ret)];
        return ret;
    }
};