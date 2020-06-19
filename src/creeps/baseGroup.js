module.exports = {
    moveTo: function(creep, groupArray, target)
    {
        //fatigue check
        if (creep.fatigue > 0) return;
        for (var c of groupArray) {
            if (c.fatigue > 0) return;
        }
        
        //move
        creep.moveTo(target);
    }, 
    
    
    addFollower: function(leader, follower)
    {
        if (!leader.memory.grp_follow) {
            leader.memory.grp_follow = [];
        }
        
        var index = _.findIndex(leader.memory.grp_follow, (s) => s == follower.id);
        if (index < 0) {
            leader.memory.grp_follow.push(follower.id);
        }
    }, 
    
    checkFollower: function(creep)
    {
        if (!creep.memory.grp_follow) {
            return;
        }
        
        for (var i in creep.memory.grp_follow) {
            var follower = Game.getObjectById(creep.memory.grp_follow[i]);
            if (!follower || follower.id == creep.id) {
                //remove follower from list
                creep.memory.grp_follow.splice(i, 1);
                return this.checkFollower(creep);
            }
        }
    }, 
    
    
    getLeader: function(creep) 
    {
        //leader = self
        if (creep.memory.grp_lead == 'self') {
            return creep;
        }
        //leader = other creep
        var ldr = Game.getObjectById(creep.memory.grp_lead);
        if (ldr) {
            this.addFollower(ldr, creep);
            return ldr;
        }
        
        //search for new leader
        var leader = _.find(Game.creeps, (s) => {
            return s.memory.grp == creep.memory.grp &&
                s.memory.grp_lead == 'self';
        });
        
        if (leader) {
            creep.memory.grp_lead = leader.id;
            return leader;
        } else {
            //set leader as self
            creep.memory.grp_lead = 'self';
            return creep;
        }
    }, 
};