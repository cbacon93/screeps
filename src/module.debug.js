module.exports = {
    run: function()
    {
        if (!Memory.debug) return;
        
        let room = Game.rooms[Memory.debug];
        if (room) {
            this.drawLogistics(room);
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
    }
};