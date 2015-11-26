// so fight me, pff
var chains

function PlayState(game) {
}

PlayState.prototype.preload = function() {
  console.log('preload');

  game.load.image('star_small', 'assets/graphics/_star_small.png');
  game.load.image('star_big', 'assets/graphics/_star_big.png');

  game.load.spritesheet('dust', 'assets/graphics/_dust.png', 8, 8);

  game.load.tilemap('level1', 'assets/maps/test.json', null, Phaser.Tilemap.TILED_JSON);
  game.load.image('tileset', 'assets/graphics/_tileset.png');

  game.load.spritesheet('player', 'assets/graphics/_player.png', 10*2, 16*2);
  game.load.spritesheet('sword', 'assets/graphics/_sword.png', 17*2, 16*2);

  game.load.spritesheet('chain', 'assets/graphics/_chain_segment.png', 5*2, 5*2);

  game.load.image('textbox', 'assets/graphics/_textbox.png');

  game.load.audio('gun', 'assets/sounds/gun.wav');
  game.load.audio('jump', 'assets/sounds/jump.wav');

  game.scale.pageAlignHorizontally = true;
  game.scale.pageAlignVertically = true;
  game.scale.refresh();
};

PlayState.prototype.create = function() {
  console.log('create');

  game.physics.startSystem(Phaser.Physics.P2JS);
  game.physics.p2.gravity.y = 1350;
  game.physics.p2.restitution = 0.1
  game.physics.p2.world.defaultContactMaterial.friction = 1.75
  game.physics.p2.world.setGlobalStiffness(1e5);
  // game.physics.p2.TILE_BIAS = 40;

  game.gun = game.add.audio('gun');
  game.jump = game.add.audio('jump');

  this.map = game.add.tilemap('level1');
  this.map.addTilesetImage('_tileset', 'tileset');
  this.bg = this.map.createLayer('BG');

  var stars = game.add.group();

  this.fg = this.map.createLayer('FG');
  this.map.setCollisionBetween(1, 300, true, this.fg);
  this.fg.resizeWorld();
  game.physics.p2.convertTilemap(this.map, this.fg)
  game.physics.p2.setBoundsToWorld(true, true, true, true, false)

  this.groundMaterial = game.physics.p2.createMaterial('ground');
  this.playerMaterial = game.physics.p2.createMaterial('player');

  var groundPlayerCM = game.physics.p2.createContactMaterial(
      this.playerMaterial, this.groundMaterial, { friction: 0.0 });

  game.physics.p2.setWorldMaterial(this.groundMaterial, true, true, true, true);


  // for(var y = 0; y < this.fg.height; ++y){
  //   for(var x = 0; x < this.fg.width; ++x){
  //       var tile = this.fg.map.getTile(x, y);
  //       if (tile) {
  //         console.log(tile.index, tile.collideDown)
  //         // tile.collidesDown
  //       }
  //   }
  // }

  for (var i=0; i < 10; i++) {
    var sprite = (game.rnd.between(0,100) < 30) ? 'star_big' : 'star_small';
    var star = stars.create(0, 0, sprite)
    star.reset = function() {
      this.x = -10;
      this.y = game.rnd.between(0, 16 * 6);
      this.speed = game.rnd.frac() * this.maxSpeed;
    };
    star.reset()
    star.x = game.rnd.between(0, game.world.width),
    star.maxSpeed = (sprite === 'star_big') ? 0.2 : 0.4;
    star.speed = game.rnd.frac() * star.maxSpeed;
    star.checkWorldBounds = true;
  }
  this.stars = stars;

  // Dust clouds
  this.dust = game.add.group();
  this.dustCollisionGroup = game.physics.p2.createCollisionGroup();

  chains = game.add.group();

  var player = game.add.sprite(16*3, 136*2, 'player');
  player.animations.add('idle', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 10, true);
  player.animations.add('jump_upward', [2], 10, false);
  player.animations.add('jump_downward', [3], 10, false);
  player.animations.play('idle');
  player.anchor.set(0.4, 0.5);
  game.physics.p2.enable(player);
  player.body.fixedRotation = true
  // player.body.debug = true
  player.body.collideWorldBounds = true;
  player.body.setMaterial(this.playerMaterial)
  player.walkForce = 150;
  player.jumpForce = 460;
  player.fireDelay = 150;
  player.fireCountdown = 0;
  player.team = 0xFF0000;
  player.jumpCountdown = 0
  this.player = player;

  player.body.onBeginContact.add(function (body, shapeA, shapeB, equation) {
    if (shapeB.material == null) {
      if (this.body.velocity.y < -10 && this.body.velocity.y > -40) {
        game.state.getCurrentState().spawnLandingDust(this.x, this.y + this.height * 0.5 - 4)
      }
    }
    // console.log(shapeA)
    // console.log(shapeB)
  }, player)

  var sword = game.add.sprite(16*2, 96*2, 'sword');
  sword.animations.add('idle', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 10, true);
  sword.animations.add('jump_upward', [2], 10, false);
  sword.animations.add('jump_downward', [3], 10, false);
  sword.animations.play('idle');
  sword.tint = player.team
  player.anchor.set(0.4, 0.5);
  player.sword = sword;

  player.canJump = function() {
    if (this.jumpCountdown > 0) {
      return false
    }
    function checkIfCanJump() {
      var yAxis = [0, 1]
      var result = false;
      for (var i=0; i < game.physics.p2.world.narrowphase.contactEquations.length; i++)
      {
        var c = game.physics.p2.world.narrowphase.contactEquations[i];
        if (c.bodyA === player.body.data || c.bodyB === player.body.data)
        {
          var d = p2.vec2.dot(c.normalA, yAxis);
          if (c.bodyA === player.body.data)
          {
            d *= -1;
          }
          if (d > 0.5)
          {
            result = true;
          }
        }
      }
      return result;
    }
    return checkIfCanJump()
    // return this.body.onFloor() || this.body.touching.down;
  };

  player.jump = function() {
    if (this.canJump()) {
      this.body.moveUp(this.jumpForce)
      // this.body.velocity.y = -this.jumpForce;
      this.jumpCountdown = 500
      game.jump.play();
      game.state.getCurrentState().spawnJumpDust(this.x, this.y + this.height * 0.5)
    }
  };

  player.update = function() {
    if (this.canJump()) {
      player.animations.play('idle');
      player.sword.animations.play('idle');
    } else if (this.body.velocity.y < -10) {
      player.animations.play('jump_upward');
      player.sword.animations.play('jump_upward');
    } else if (this.body.velocity.y > 10) {
      player.animations.play('jump_downward');
      player.sword.animations.play('jump_downward');
    }

    player.sword.x = player.x - player.anchor.x * player.width + player.body.velocity.x * game.time.physicsElapsed
    player.sword.y = player.y - player.anchor.y * player.height + player.body.velocity.y * game.time.physicsElapsed
  };

  player.shootChain = function(dirX, dirY) {
    var segs = []
    for (var i=0; i < 10; i++) {
      var chain = chains.create(player.x + i*10, player.y, 'chain');
      chain.tint = player.team
      game.physics.p2.enable(chain);
      chain.body.allowGravity = true;
      chain.anchor.set(0.5, 0.5);

      chain.links = []

      chain.update = function() {
        for (var j in this.links) {
          var link = this.links[j]
          var dx = link.x - this.x
          var dy = link.y - this.y
          var dist = Math.sqrt(dx*dx + dy*dy)
          var ideal_distance = 8
          var k = 0.5
          if (dist > ideal_distance) {
            this.body.velocity.x += dx * k
            this.body.velocity.y += dy * k
          }
          if (dist < ideal_distance) {
            this.body.velocity.x += -dx * k
            this.body.velocity.y += -dy * k
          }
        }
        // this.body.velocity.x *= 0.8
        // this.body.velocity.y *= 0.8
      };

      segs[i] = chain
      if (i > 0) {
        chain.links.push(segs[i-1])
        segs[i-1].links.push(chain)
      }
    }
    segs[9].body.velocity.x = dirX * 20;
    segs[9].body.velocity.y = dirY * 20;
    player.chain = {
      segs: segs
    }
  };
};


PlayState.prototype.update = function() {

  if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT)) {
    // this.player.body.velocity.x = -this.player.walkForce;
    this.player.body.moveLeft(this.player.walkForce)
    this.player.scale.x = -1;
    this.player.sword.scale.x = -1;
  }
  if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)) {
    // this.player.body.velocity.x = this.player.walkForce;
    this.player.body.moveRight(this.player.walkForce)
    this.player.scale.x = 1;
    this.player.sword.scale.x = 1;
  }

  this.player.update();

  if (game.input.keyboard.justPressed(Phaser.Keyboard.SPACEBAR)) {
    if (!this.player.chain) {
      this.player.shootChain(this.player.scale.x === -1 ?
          this.player.x - 50 : this.player.x + 35, 0)
      this.player.fireCountdown = this.player.fireDelay;
      game.gun.play();
    }
  }
  this.player.fireCountdown -= game.time.elapsed;
  this.player.jumpCountdown -= game.time.elapsed;

  if (game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
    this.player.jump();
  }

  this.stars.forEachAlive(function(s) {
    s.x += s.speed;
    if (s.x > game.world.width + 10) {
      s.reset()
    }
  });
};

PlayState.prototype.render = function() {
  // game.debug.body(this.player);
}

PlayState.prototype.spawnDust = function(x, y) {
  var dust = this.dust.create(x, y, 'dust');
  dust.anchor.set(0.5, 0.5);
  dust.animations.add('normal', [0, 1, 2, 3, 4], 10);
  dust.animations.play('normal', null, false, true);
  game.physics.p2.enable(dust)
  dust.body.setCollisionGroup(this.dustCollisionGroup)
  dust.body.kinematic = true
  dust.body.allowGravity = false
  return dust
}

PlayState.prototype.spawnJumpDust = function(x, y) {
  for (var i=0; i < 2; i++) {
    var dust = game.state.getCurrentState().spawnDust(x, y)
    dust.body.velocity.x = (i < 1 ? -1 : 1) * game.rnd.between(20, 30)
    dust.body.velocity.y = game.rnd.between(0, -10)
  }
  for (var i=0; i < 3; i++) {
    var dust = game.state.getCurrentState().spawnDust(x + game.rnd.between(-5, 5), y)
    dust.body.velocity.x = game.rnd.between(-10, 10)
    dust.body.velocity.y = game.rnd.between(-25, -50)
  }
}

PlayState.prototype.spawnLandingDust = function(x, y) {
  for (var i=0; i < 6; i++) {
    var dust = game.state.getCurrentState().spawnDust(x, y)
    dust.body.velocity.x = (i < 3 ? -1 : 1) * game.rnd.between(30, 40)
    dust.body.velocity.y = 20
    dust.update = function() {
      this.body.velocity.y -= 20
      // this.body.velocity.x *= 0.99999
    }
  }
}

// based on example code from http://phaser.io/examples/v2/p2-physics/chain
PlayState.prototype.createRope = function (length, xAnchor, yAnchor) {
  var lastRect;
  var height = 20;        //  Height for the physics body - your image height is 8px
  var width = 16;         //  This is the width for the physics body. If too small the rectangles will get scrambled together.
  var maxForce = 20000;   //  The force that holds the rectangles together.

  for (var i = 0; i <= length; i++)
  {
    var x = xAnchor;                    //  All rects are on the same x position
    var y = yAnchor + (i * height);     //  Every new rect is positioned below the last

    newRect = game.add.sprite(x, y, 'chain')

    //  Enable physicsbody
    game.physics.p2.enable(newRect, false);

    //  Set custom rectangle
    newRect.body.setRectangle(width, height);

    if (i === 0)
    {
        newRect.body.static = true;
    }
    else
    {  
        //  Anchor the first one created
        newRect.body.velocity.x = 400;      //  Give it a push :) just for fun
        newRect.body.mass = length / i;     //  Reduce mass for evey rope element
    }

    //  After the first rectangle is created we can add the constraint
    if (lastRect)
    {
        game.physics.p2.createRevoluteConstraint(newRect, [0, -10], lastRect, [0, 10], maxForce);
    }

    lastRect = newRect;
  }
}

var w = 160 * 4;
var h = 144 * 4;
var game = new Phaser.Game(w, h, Phaser.AUTO, 'monochain');
game.state.add('play', PlayState);
game.state.start('play');
