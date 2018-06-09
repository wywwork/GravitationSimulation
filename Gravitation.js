

var MyActionTag = {
    circleTag:1,
    freeFallTag:2,
    gravitationTag:3
}


//Circular Motion, need center of circle, radius, start angle and periodic time
//This action runs only one cycle, and if it needs to continue, use the cc.RepeatForever.
var Circle = cc.ActionInterval.extend({
    _center:null,
    _radius:null,
    _start_angle:null,
    _speed:0,

    //instantaneous speed
    speed_x:0,
    speed_y:0,

    ctor:function (center, radius, start_angle, periodic) {
        cc.ActionInterval.prototype.initWithDuration.call(this, periodic);
        this._center = center;
        this._radius = radius;
        this._start_angle = start_angle;
        this._speed = 2*Math.PI*this._radius/this._duration;
    },
    clone:function () {
        var action = new Circle(this._duration, this._center, this._radius, this._start_angle);
        this._cloneDecoration(action);
        return action;
    },
    update:function (dt) {
        dt = this._computeEaseTime(dt);
        if (this.target) {
            var angle = dt*2*Math.PI + this._start_angle;
            var sin_angle = Math.sin(angle);
            var cos_angle = Math.cos(angle)
            var x = this._center.x + this._radius * cos_angle;
            var y = this._center.y + this._radius * sin_angle;
            this.speed_y = this._speed * cos_angle;
            this.speed_x = -1 * this._speed * sin_angle;
            this.target.setPosition(x, y);
        }
    }
});

var FreeFall = cc.ActionInterval.extend({
    _start_speed_x:null,
    _start_speed_y:null,
    _start_position:null,
    
    ctor:function (duration, speed_x, speed_y) {
        cc.ActionInterval.prototype.initWithDuration.call(this, duration);
        this._start_speed_x = speed_x;
        this._start_speed_y = speed_y;
        this._start_position = cc.p(0,0);
    },
    startWithTarget:function (target) {
        cc.ActionInterval.prototype.startWithTarget.call(this, target);
        var locPosX = target.getPositionX();
        var locPosY = target.getPositionY();
        this._start_position.x = locPosX;
        this._start_position.y = locPosY;
    },
    clone:function () {
        var action = new FreeFall(this._duration, this._start_speed_x, this._start_speed_y);
        this._cloneDecoration(action);
        return action;
    },
    reverse:function () {
        return clone();
    },
    update:function (dt) {
        dt = this._computeEaseTime(dt);
        if (this.target) {
            var time = dt*this._duration;
            var x = this._start_position.x + time*this._start_speed_x;
            var y = this._start_position.y + time*this._start_speed_y - 500*time*time;
            this.target.setPosition(x, y);
        }
    }
});

var Gravitation = cc.ActionInterval.extend({
    _current_speed_x:0,
    _current_speed_y:0,
    _current_x:0,
    _current_y:0,

    _fixed_star:null,
    _last_dt:0,

    ctor:function (duration, fixed_star, speed_x, speed_y) {
        cc.ActionInterval.prototype.initWithDuration.call(this, duration);
        this._current_speed_x = speed_x;
        this._current_speed_y = speed_y;
        this._fixed_star = fixed_star;
    },
    startWithTarget:function (target) {
        cc.ActionInterval.prototype.startWithTarget.call(this, target);
        var locPosX = target.getPositionX();
        var locPosY = target.getPositionY();
        this._current_x = locPosX;
        this._current_y = locPosY;
    },
    updatePosition: function(dt) {
        //Calculating acceleration
        var dx = this._fixed_star.x - this._current_x;
        var dy = this._fixed_star.y - this._current_y;
        var r_square = dx*dx + dy*dy + 1;
        var r = Math.sqrt(r_square);
        var acceleration = this._fixed_star.mass/r_square;
        var acceleration_x = acceleration*dx/r;
        var acceleration_y = acceleration*dy/r;

        //Calculating position
        this._current_x += dt*this._current_speed_x + 0.5*acceleration_x*dt*dt;
        this._current_y += dt*this._current_speed_y + 0.5*acceleration_y*dt*dt;

        //Updating speed
        this._current_speed_x+=acceleration_x*dt;
        this._current_speed_y+=acceleration_y*dt;
    },
    clone:function () {
        var action = new Gravitation(this._duration, this._current_speed_x, this._current_speed_y, this._mass, this._black_holes);
        this._cloneDecoration(action);
        return action;
    },
    update:function (dt) {
        dt = this._computeEaseTime(dt);
        if (this.target) {
            var time = (dt-this._last_dt)*this._duration;
            this._last_dt = dt;
            var title_num = 10*Math.ceil(Math.abs(time*this._current_speed_x)+Math.abs(time*this._current_speed_y));
            for (var i = 0; i < title_num; i++)
                this.updatePosition(time/title_num);
            this.target.setPosition(Math.floor(this._current_x), Math.floor(this._current_y));
        }
    }
});

var Star = cc.DrawNode.extend({
    radius:0,
    mass:0,

    ctor:function (radius, mass, color) {
        this._super();
        this.radius = radius;
        this.mass = mass;
        this.drawDot(cc.p(0,0), this.radius, color);
    },
});

var Galaxy = cc.Layer.extend({
    fixed_star:null,
    planets:null,

    ctor:function() {
        this._super();
        this.planets = new Map();
    },

    setFixedStar:function (fixed_star, position) {
        this.fixed_star = fixed_star;
        this.fixed_star.setPosition(position.x, position.y);
        this.addChild(this.fixed_star);
    },
    addPlanet:function (id, star, position, speed_x, speed_y) {
        var action = new Gravitation(60, this.fixed_star, speed_x, speed_y);
        action.setTag(MyActionTag.gravitationTag);
        star.setPosition(position.x, position.y);
        star.runAction(action);
        this.planets.set(id, star);
        this.addChild(star);
    }
});


var MyScene = cc.Scene.extend({
    _stars:null,
    _start_num:500,

    _black_hole:null,

    onEnter:function () {
        this._super();
        var size = cc.director.getWinSize();
        var ccLayer = new cc.LayerColor(cc.color(0,0,0,255),size.width, size.height);
        this.addChild(ccLayer);

        var my_galaxy = new Galaxy();
        this.addChild(my_galaxy);

        var my_sun = new Star(30, 9000000, cc.color(0, 0, 255, 255));
        my_galaxy.setFixedStar(my_sun, cc.p(size.width/2, size.height/2));

        var plamet1 = new Star(6, 1, cc.color(255, 255, 255, 255));
        my_galaxy.addPlanet("planet1", plamet1, cc.p(size.width/2 + 100, size.height/2), 0, 300);

        var plamet2 = new Star(8, 1, cc.color(255, 255, 255, 255));
        my_galaxy.addPlanet("planet2", plamet2, cc.p(size.width/2 + 180, size.height/2), 0 , 223.607);

        var plamet3 = new Star(10, 1, cc.color(255, 255, 255, 255));
        my_galaxy.addPlanet("planet3", plamet3, cc.p(size.width/2 , size.height/2 + 250), -189.737, 0);

        var plamet4 = new Star(5, 1, cc.color(255, 255, 255, 255));
        my_galaxy.addPlanet("planet4", plamet4, cc.p(size.width/2 + 250, size.height/2 +250), -60, 60);
    },

    // ctor:function () {
    //     this._super();
    //     if ('mouse' in cc.sys.capabilities) {
    //         cc.eventManager.addListener({
    //             event: cc.EventListener.MOUSE,
    //             onMouseDown: function (event) {
    //                 var target = event.getCurrentTarget();
    //                 var pos = event.getLocation();
    //                 //target.transfromBlackHole(pos);
    //             },
    //         }, this);
    //     }
    //
    //     if ('keyboard' in cc.sys.capabilities) {
    //         cc.eventManager.addListener({
    //             event: cc.EventListener.KEYBOARD,
    //             onKeyPressed: function (keyCode, event) {
    //                 var target = event.getCurrentTarget();
    //                 if (keyCode == 70) {
    //                     target.transfromFreefaller();
    //                 } else if (keyCode == 66) {
    //                     target.transfromBlackHole();
    //                 }
    //
    //             }
    //         }, this)
    //     }
    // },
    //
    // transfromFreefaller: function () {
    //     for (var i = 0; i < this._start_num; i++){
    //         this._stars[i].node.stopAllActions();
    //         var speed_x = this._stars[i].action.speed_x;
    //         var speed_y = this._stars[i].action.speed_y;
    //         this._stars[i].action = new Freefaller(3,speed_x,speed_y);
    //         this._stars[i].node.runAction(this._stars[i].action);
    //     }
    // },
    //
    // transfromBlackHole: function (pos) {
    //     var black_holes = new Array();
    //     black_holes[0] = new BlackHole(1000000000, pos);
    //     this.addChild(black_holes[0].node);
    //
    //     for (var i = 0; i < this._start_num; i++){
    //         this._stars[i].node.stopAllActions();
    //         var speed_x = this._stars[i].action.speed_x;
    //         var speed_y = this._stars[i].action.speed_y;
    //         this._stars[i].action =  new Gravitation(30,speed_x,speed_y,black_holes);
    //         this._stars[i].node.runAction(this._stars[i].action);
    //     }
    // },
});

