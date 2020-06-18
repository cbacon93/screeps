module.exports = {
    cycle_timeout: 30000,
    run: function(ops)
    {
        this.init(ops);
        
        // 30000 cycle timeout // 48h
        if (ops.mem.cycle_timeout + this.cycle_timeout > Game.time) return;
        ops.mem.cycle_timeout = Game.time;
        
        // SOURCE ROOM NOT AVBL - ABORT
        if (Ops.checkSrcRoomAvbl(ops)) return;
        
        //AUTO SCOUT
        Ops.new("scout_vicinity", ops.source, "");
        
        //AUTO CLAIM NEW ROOMS
        this.autoClaim(ops);
        
        //AUTO HARVEST OPS
        this.autoHarvest(ops);
    }, 
    
    
    init: function(ops)
    {
        if (ops.mem.init) return;
        ops.mem.init = true;
        ops.mem.cycle_timeout = Game.time;

    },
    
    
    autoClaim: function(ops)
    {
        var myrooms = _.filter(Game.rooms, (s) => s.controller && s.controller.my);
        if (myrooms.length < Game.gcl.level) 
        {
            //only claim if reached level 4 or higher
            var myroom = Game.rooms[ops.source];
            if (myroom.controller.level >= 4) 
            {
                //pick best room
                if (!Memory.intel || !Memory.intel.claimable) return;
                
                var bestroom = false;
                var bestroom_pts = -99999;
                
                for (var i in Memory.intel.claimable) {
                    
                    //check claim calcs
                    var claim = Memory.intel.claimable[i];
                    if (!claim.parsed) continue;
                    if (claim.points < -1600) continue;
                    
                    //check room not already owned
                    var room = Game.rooms[claim.room];
                    if (room && room.controller && room.controller.my) continue;
                    
                    //check intel
                    var intel = Intel.getIntel(claim.room);
                    if (intel.threat != "none") continue;
                    
                    //check distance
                    var dist = Game.map.getRoomLinearDistance(ops.source, claim.room);
                    if (dist > 10) continue;
                    
                    //check no claim ops started
                    var index = _.findIndex(Memory.ops, (s) => s.type == "claim" && s.target == claim.room);
                    if (index >= 0) continue;
                    
                    //room seems good - save
                    if (claim.points > bestroom_pts) {
                        bestroom = claim.room;
                        bestroom_pts = claim.points;
                    }
                } //for
                
                // valid room found - start claim ops
                if (bestroom) {
                    Ops.new("claim", ops.source, bestroom);
                    Game.notify(ops.source + ": Autoclaim on " + bestroom);
                    console.log(ops.source + ": Autoclaim on " + bestroom);
                    return true;
                }
                
            }
        }
        return false;
    }, 
    
    
    autoHarvest: function(ops)
    {
        var room = Game.rooms[ops.source];
        for (var i in Memory.intel.list) {
            var intel = Memory.intel.list[i];
            if (intel.threat != "none") continue;
            
            var dist = Game.map.getRoomLinearDistance(ops.source, intel.name, true);
            if (dist <= 1 || 
                room.controller.level >= 6 && dist <= 5 && intel.deposits) 
            {
                //source and mineral ops
                //check if no harvest ops exist
                var j = _.findIndex(Memory.ops, (o) => { return o.target == intel.name; });
                if (j < 0) {
                    Ops.new("harvest", ops.source, intel.name);
                    return;
                }
            }
        }
    }
};