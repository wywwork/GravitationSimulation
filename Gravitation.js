
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

    _new_speed_x: undefined,
    _new_speed_y: undefined,

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
            if (this._new_speed_x != undefined && this._new_speed_y != undefined) {
                this._current_speed_x = this._new_speed_x;
                this._current_speed_y = this._new_speed_y;
                this._new_speed_x = undefined;
                this._new_speed_y = undefined;
            }

            var time = (dt-this._last_dt)*this._duration;
            this._last_dt = dt;
            var title_num = 10*Math.ceil(Math.abs(time*this._current_speed_x)+Math.abs(time*this._current_speed_y));
            for (var i = 0; i < title_num; i++)
                this.updatePosition(time/title_num);
            this.target.setPosition(Math.floor(this._current_x), Math.floor(this._current_y));
        }
    },

    setNewSpeed: function (speed_x, speed_y) {
        this._new_speed_x = speed_x;
        this._new_speed_y = speed_y;
    }
});

var Planet = cc.DrawNode.extend({
    radius:0,
    mass:0,

    ctor:function (radius, mass, color) {
        this._super();
        this.radius = radius;
        this.mass = mass;
        this.drawDot(cc.p(0,0), this.radius, color);
    },
});

var FixedStar = cc.ParticleSun.extend({
    radius:0,
    mass:0,

    ctor:function (radius, mass) {
        this._super();
        this.radius = radius;
        this.mass = mass;
        this.setStartSize(this.radius*0.8);
        this.setEndSize(this.radius*0.2);
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
    addPlanet:function (id, planet, position, speed_x, speed_y) {
        var action = new Gravitation(60, this.fixed_star, speed_x, speed_y);
        action.setTag(MyActionTag.gravitationTag);
        planet.setPosition(position.x, position.y);
        planet.runAction(action);
        this.planets.set(id, planet);
        this.addChild(planet);
    },
    getPlanetById:function (id) {
        return this.planets.get(id);
    },
});


var MyScene = cc.Scene.extend({
    _my_galaxy:null,

    onEnter:function () {
        this._super();
        var size = cc.director.getWinSize();
        var ccLayer = new cc.LayerColor(cc.color(0,0,0,255),size.width, size.height);
        this.addChild(ccLayer);

        this._my_galaxy = new Galaxy();
        this.addChild(this._my_galaxy);

        var my_sun = new FixedStar(50, 9000000);
        this._my_galaxy.setFixedStar(my_sun, cc.p(size          .width/2, size.height/2));

        var planet1 = new Planet(6, 1, cc.color(255, 255, 255, 255));
        this._my_galaxy.addPlanet("planet1", planet1, cc.p(size.width/2 + 100, size.height/2), 0, 300);

        var planet2 = new Planet(8, 1, cc.color(255, 255, 255, 255));
        this._my_galaxy.addPlanet("planet2", planet2, cc.p(size.width/2 + 180, size.height/2), 0 , 223.607);

        var planet3 = new Planet(9, 1, cc.color(255, 255, 255, 255));
        this._my_galaxy.addPlanet("planet3", planet3, cc.p(size.width/2 , size.height/2 + 250), -189.737, 0);

        var planet4 = new Planet(5, 1, cc.color(255, 255, 255, 255));
        this._my_galaxy.addPlanet("planet4", planet4, cc.p(size.width/2 + 250, size.height/2 +250), -60, 60);

        var planet5 = new Planet(7, 1, cc.color(255, 255, 255, 255));
        this._my_galaxy.addPlanet("planet5", planet5, cc.p(size.width/2 , size.height/2 + 300), -173.205, 0);
    },

    ctor:function () {
        this._super();
        if ('mouse' in cc.sys.capabilities) {
            cc.eventManager.addListener({
                event: cc.EventListener.MOUSE,
                onMouseDown: function (event) {
                    var target = event.getCurrentTarget();
                    var action = target._my_galaxy.getPlanetById("planet1").getActionByTag(MyActionTag.gravitationTag);
                    action.setNewSpeed(action._current_speed_x*1.1, action._current_speed_y*1.1);
                },
            }, this);
        }
    },
});

