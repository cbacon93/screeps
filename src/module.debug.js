module.exports = {
    run: function()
    {
        if (!Memory.debug) return;
        
        let room = Game.rooms[Memory.debug];
        if (room) {
            this.drawLogistics(room);
            this.drawOps(room);
        }
    }, 
    
    start: function(roomname)
    {
        Memory.debug = roomname;
    },
    
    stop: function()
    {
        delete Memory.debug;
    }, 
    
    log: function(roomname, opsname, text, broadcast = false)
    {
        if (Memory.debug != roomname && !broadcast) return;
        console.log(Game.time + " " + roomname + " " + opsname + ": " + text);
    }, 
    
    notify: function(roomname, opsname, text)
    {
        let msg = Game.time + " " + roomname + " " + opsname + ": " + text;
        console.log(msg);
        Game.notify(msg);
    }, 
    
    drawLogistics: function(room)
    {
        //print debug
        room.visual.text("Transport Tasks", 1, 1, {align: 'left'});
        var i = 0;
        for (var id in room.memory.ltasks) {
            var task = room.memory.ltasks[id];
            i++;
            
            room.visual.text(task.id, 1, 1+i, {align: 'left'});
            room.visual.text(task.type, 5, 1+i, {align: 'left'});
            room.visual.text(task.vol, 7, 1+i, {align: 'left'});
            room.visual.text(task.res, 9, 1+i, {align: 'left'});
            room.visual.text(task.acc, 13, 1+i, {align: 'left'});
            room.visual.text(task.utx, 15, 1+i, {align: 'left'});
            
            
        }
    }, 
    
    drawOps: function(room)
    {
        var ops = _.filter(Memory.ops, (o) => o.source == room.name);
        
        room.visual.text("Ops", 35, 1, {align: 'left'});
        i=0;
        for (var j in ops) {
            i++;
            room.visual.text(ops[j].type, 35, 1+i, {align: 'left'});
            room.visual.text(ops[j].target, 40, 1+i, {align: 'left'});
            
            if (ops[j].type == 'harvest') {
                room.visual.text(Game.time - ops[j].mem.timeout, 43, 1+i, {align: 'left'});
            }
            if (ops[j].type == 'room_lifetime') {
                room.visual.text(Game.time - ops[j].mem.scout_timeout, 43, 1+i, {align: 'left'});
                room.visual.text(Game.time - ops[j].mem.harvest_timeout, 45, 1+i, {align: 'left'});
                room.visual.text(Game.time - ops[j].mem.autoclaim_timeout, 47, 1+i, {align: 'left'});
            }
        }
    }
};