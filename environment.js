Crafty.c('GroundManager', {
  init: function() {
    this.segments = [];
    this.left = -SEGMENT_WIDTH;
    this.right = -SEGMENT_WIDTH;

    this.bind('EnterFrame', function() {
      var worldLeft = -Crafty.viewport.x - SEGMENT_WIDTH;
      var worldRight = -Crafty.viewport.x + W;

      while (this.left < worldLeft && this.segments.length > 0) {
        var segment = this.segments.shift();
        this.left += SEGMENT_WIDTH * cos(segment.rotation);
        segment.destroy();
      }
      
      this.extendTo(worldRight);
    });
  },

  extendTo: function(x) {
    while (this.right < x) {
      var prevSegment = this.segments[this.segments.length - 1];
      var prevY = prevSegment ? prevSegment.y + SEGMENT_WIDTH * sin(prevSegment.rotation) : GROUND_MAX_Y;
      var prevRotation = prevSegment ? prevSegment.rotation : 0;

      var segment = Crafty.e('2D, Canvas, ground_start, Collision, Ground')
        .attr({x: this.right - SKIRT_WIDTH, y: prevY, z: 1})
        .origin(SKIRT_WIDTH, SKIRT_HEIGHT)
        .sprite(randInt(3), 0)
        .collision(
            [0, 2 * SKIRT_HEIGHT],
            [SKIRT_WIDTH, SKIRT_HEIGHT],
            [SKIRT_WIDTH + SEGMENT_WIDTH, SKIRT_HEIGHT],
            [SKIRT_WIDTH + SEGMENT_WIDTH + SKIRT_WIDTH, 2 * SKIRT_HEIGHT]);
      var bias = 2 * (0.5 - (prevY + SKIRT_HEIGHT - GROUND_MIN_Y) / (GROUND_MAX_Y - GROUND_MIN_Y));
      bias *= bias * bias;
      var delta = -0.5 * prevRotation + 10 * bias + randFloat(-30, 30);
      delta = clamp(-40, 40, delta);
      segment.rotation = clamp(-40, 40, prevRotation + delta);
      if (prevY + SKIRT_HEIGHT > GROUND_MAX_Y && segment.rotation > 0) {
        segment.rotation = 0;
      } else if (prevY + SKIRT_HEIGHT < GROUND_MIN_Y && segment.rotation < 0) {
        segment.rotation = 0;
      }

      var bottomY = Math.max(prevY, prevY + SEGMENT_WIDTH * sin(segment.rotation)) + SKIRT_HEIGHT;
      var bottom = Crafty.e('2D, Canvas, Color, Collision, Ground')
        .attr({x: this.right, y: bottomY, w: SEGMENT_WIDTH * cos(segment.rotation) + 1, h: H - bottomY, z: 1})
        .color('#000');
      segment.bind('Remove', (function(bottom) {
        return function() {
          bottom.destroy();
        }
      }(bottom)));

      this.segments.push(segment);
      this.right += SEGMENT_WIDTH * cos(segment.rotation);
    }
  },

  heightAt: function(x) {
    this.extendTo(x);
    for (var i = 0; i < this.segments.length; i++) {
      var segment = this.segments[i];
      var startX = segment.x + SKIRT_WIDTH;
      var endX = startX + SEGMENT_WIDTH * cos(segment.rotation);
      if (x >= startX && x <= endX) {
        var startY = segment.y + SKIRT_HEIGHT;
        var endY = startY + SEGMENT_WIDTH * sin(segment.rotation);
        return lerp(startY, endY, (x - startX) / (endX - startX));
      }
    }
  },
});

Crafty.c('SnapToGround', {
  snapToGround: function() {
    var groundManager = Crafty('GroundManager');
    var heightLeft = groundManager.heightAt(this.x);
    var heightRight = groundManager.heightAt(this.x + this.w);
    this.y = Math.max(heightLeft, heightRight) - this.h;
    return this;
  },
});
