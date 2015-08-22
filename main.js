var W = 1200;
var H = 800;

var G = .05;
var FLAP_SPEED = 4;
var FLAP_TIME = 10;
var FLAP_INTERVAL = 30;
var FIRE_INTERVAL = 60;
var GROUND_Y = 650;
var ARCHER_WIDTH = 10;
var ARCHER_HEIGHT = 30;
var ARROW_SPEED = 5;

Crafty.init(W, H, document.getElementById('game'));
Crafty.timer.FPS(60);

Crafty.c('Dragon', {
  init: function() {
    this.dragon = null;
  },
});

Crafty.c('Tail', {
  init: function() {
    this.requires('2D, Canvas, Color, Dragon');
    this.bind('EnterFrame', function() {
      if (!this.dragon) return;

      var pos = this.dragon.trailAt(this.delay);
      this.x = pos.x - this.w/2;
      this.y = pos.y - this.h/2;

      var prevPos = this.dragon.trailAt(this.delay - 1);
      this.rotation = radToDeg(Math.atan2(pos.y - prevPos.y, pos.x - prevPos.x));
    });
  },

  tail: function(dragon, delay) {
    this.dragon = dragon;
    this.delay = delay;
    this.dragon.bind('Remove', function() {
      this.destroy();
    }.bind(this));
    return this;
  },
});

Crafty.c('DragonCore', {
  init: function() {
    this.requires('2D, Canvas, Color, Collision, Dragon');
    this.vx = 3;
    this.vy = 0;
    this.flapDelay = 0;
    this.fireDelay = 0;
    this.dragon = this;
    this.trail = [];

    this
      .attr({w: 50, h: 50})
      .origin(25, 25);

    this.bind('EnterFrame', function() {
      this.vy += G;
      if (this.flapTime > 0) {
        this.vy -= FLAP_SPEED / FLAP_TIME;
        this.flapTime--;
      }
      this.x += this.vx;
      this.y += this.vy;

      this.rotation = radToDeg(Math.atan2(this.vy, this.vx));

      this.flapDelay--;
      this.fireDelay--;

      this.trail.unshift(this.center());
      if (this.trail.length > 100) {
        this.trail.pop();
      }
    });

    this.onHit('Ground', function() {
      this.die();
    });

    for (var i = 1; i < 10; i++) {
      var c = 255 - 25 * i;
      Crafty.e('Tail')
        .attr({w: 40, h: 40})
        .origin(20, 20)
        .color(c, c, c)
        .tail(this, 5 * i);
    }
  },

  center: function() {
    return {x: this.x + this.w/2, y: this.y + this.h/2};
  },

  trailAt: function(delay) {
    if (this.trail.length == 0) return this.center();
    return this.trail[Math.min(delay, this.trail.length - 1)];
  },

  flap: function() {
    if (this.y < 0) return;
    if (this.flapDelay > 0) return;
    this.flapTime = FLAP_TIME;
    this.flapDelay = FLAP_INTERVAL;
    return this;
  },

  fire: function() {
    if (this.fireDelay > 0) return;
    this.fireDelay = FIRE_INTERVAL;
    return this;
  },

  takeDamage: function(damage) {
    this.die();
  },

  die: function() {
    this.destroy();
    Crafty.e('Delay').delay(function() {
      Crafty.enterScene('game');
    }, 1000);
  },
});

Crafty.c('Ground', {
  init: function() {
    this.requires('2D, Canvas, Color');
    this
      .attr({y: GROUND_Y, w: W*3, h: H - GROUND_Y})
      .color('#ffffff');
    this.bind('EnterFrame', function() {
      this.x = -Crafty.viewport.x;
    });
  },
});

Crafty.c('Archer', {
  init: function() {
    this.requires('2D, Canvas, Color');
    this
      .attr({w: ARCHER_WIDTH, h: ARCHER_HEIGHT})
      .color('#dddddd');

    var cooldown = 0;

    this.bind('EnterFrame', function() {
      if (cooldown > 0) {
        cooldown--;
      } else {
        if (Math.random() < 0.01) {
          var dragon = Crafty('DragonCore');
          var vx = dragon.x - this.x;
          var vy = dragon.y - this.y;
          var f = ARROW_SPEED / length(vx, vy);
          vx *= f;
          vy *= f;
          Crafty.e('Arrow, Despawn')
            .attr({x: this.x, y: this.y})
            .fire(vx, vy);
          cooldown = 60;
        }
      }
    });
  },
});

Crafty.c('Arrow', {
  init: function() {
    this.requires('2D, Canvas, Color, Collision');
    this
      .attr({w: 30, h: 4})
      .color('#ffffff');

    this.vx = 0;
    this.vy = 0;

    this.bind('EnterFrame', function() {
      this.x += this.vx;
      this.y += this.vy;
    });

    this.onHit('Dragon', function(e) {
      var dragon = e[0].obj.dragon;
      if (!dragon) return;
      dragon.takeDamage(10);
    });
  },

  fire: function(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    this.rotation = radToDeg(Math.atan2(this.vy, this.vx));
  },
});

Crafty.c('Spawner', {
  init: function() {
    var cooldown = 0;
    this.bind('EnterFrame', function() {
      if (cooldown > 0) {
        cooldown--;
      } else {
        if (Math.random() < 0.005) {
          Crafty.e('Archer, Despawn')
            .attr({x: -Crafty.viewport.x + W, y: GROUND_Y - ARCHER_HEIGHT});
          cooldown = 60;
        }
      }
    });
  },
});

Crafty.c('Despawn', {
  init: function() {
    this.bind('EnterFrame', function() {
      if (this.x + this.w < -Crafty.viewport.x) {
        this.destroy();
      }
    });
  },
});

Crafty.c('FollowedByCamera', {
  init: function() {
    this.bind('EnterFrame', function() {
      Crafty.viewport.scroll('x', -(this.x - 200));
    });
  },
});

Crafty.c('Input', {
  init: function() {
    this.requires('Dragon');

    var keyHandler = function(e) {
      if (e.key == Crafty.keys.UP_ARROW) {
        this.flap();
      } else if (e.key == Crafty.keys.SPACE) {
        this.fire();
      }
    }.bind(this);

    var mouseHandler = function mouseHandler(e) {
      if (e.button == 0) {
        this.flap();
      } else if (e.button == 2) {
        this.fire();
      }
    }.bind(this);

    Crafty.bind('KeyDown', keyHandler);
    document.onmousedown = mouseHandler;

    this.bind('Remove', function() {
      Crafty.unbind('KeyDown', keyHandler);
      document.onmousedown = null;
    });
  },
});

Crafty.defineScene('game', function() {
  Crafty('*').destroy();

  var dragon = Crafty.e('DragonCore, Input, FollowedByCamera')
    .attr({x: 100, y: 100})
    .color('#ffffff');

  Crafty.e('Ground');

  Crafty.e('Spawner');
});

Crafty.enterScene('game');
