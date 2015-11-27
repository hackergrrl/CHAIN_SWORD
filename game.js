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
  game.load.spritesheet('player_sword', 'assets/graphics/_sword.png', 17*2, 16*2);
  game.load.image('sword', 'assets/graphics/_raw_sword.png');

  game.load.image('chain', 'assets/graphics/_chain_segment.png')

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
  game.physics.p2.world.defaultContactMaterial.friction = 0.5
  game.physics.p2.world.setGlobalStiffness(1e5);
  // game.physics.p2.TILE_BIAS = 40;

  game.gun = game.add.audio('gun');
  game.jump = game.add.audio('jump');

  this.dustCollisionGroup = game.physics.p2.createCollisionGroup();
  this.chainCollisionGroup = game.physics.p2.createCollisionGroup();
  this.playerCollisionGroup = game.physics.p2.createCollisionGroup();
  this.groundCollisionGroup = game.physics.p2.createCollisionGroup();

  this.map = game.add.tilemap('level1');
  this.map.addTilesetImage('_tileset', 'tileset');
  this.bg = this.map.createLayer('BG');

  var stars = game.add.group();

  this.groundMaterial = game.physics.p2.createMaterial('ground');
  this.playerMaterial = game.physics.p2.createMaterial('player');
  var groundPlayerCM = game.physics.p2.createContactMaterial(this.groundMaterial, this.playerMaterial)
  groundPlayerCM.friction = 1.0
  // groundPlayerCM.stiffness = 1e7
  var groundChainCM = game.physics.p2.createContactMaterial(this.chainMaterial, this.groundMaterial)
  groundChainCM.friction = 0.5

  this.fg = this.map.createLayer('FG');
  this.map.setCollisionBetween(1, 300, true, this.fg);
  this.fg.resizeWorld();
  var tiles = game.physics.p2.convertTilemap(this.map, this.fg)
  var that = this
  tiles.forEach(function (tile) {
    tile.setCollisionGroup(that.groundCollisionGroup)
    tile.collides([that.playerCollisionGroup, that.chainCollisionGroup])
    tile.setMaterial(that.groundMaterial)
  })
  game.physics.p2.setBoundsToWorld(true, true, true, true, false)

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

  chains = game.add.group();

  var player = game.add.sprite(16*3, 136*2, 'player');
  player.animations.add('idle', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 10, true);
  player.animations.add('jump_upward', [2], 10, false);
  player.animations.add('jump_downward', [3], 10, false);
  player.animations.play('idle');
  player.anchor.set(0.4, 0.5);
  game.physics.p2.enable(player);
  player.body.setMaterial(this.playerMaterial)
  player.body.fixedRotation = true
  player.body.setCollisionGroup(this.playerCollisionGroup)
  player.body.collides([this.groundCollisionGroup])
  // player.body.debug = true
  player.body.mass = 10
  player.body.collideWorldBounds = true;
  player.walkForce = 30000;
  player.jumpForce = 460;
  player.fireDelay = 150;
  player.fireCountdown = 0;
  player.team = 0xFF0000;
  player.jumpCountdown = 0
  this.player = player;

  player.body.onBeginContact.add(function (body, shapeA, shapeB, equation) {
      if (shapeB.material.name == 'ground') {
      if (this.body.velocity.y < -10 && this.body.velocity.y > -40) {
        game.state.getCurrentState().spawnLandingDust(this.x, this.y + this.height * 0.5 - 4)
      }
    }
    // console.log(shapeA.material)
    // console.log(shapeB.material)
  }, player)

  var sword = game.add.sprite(16*2, 96*2, 'player_sword');
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
    player.sword.visible = !this.chain

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

    // reel sword back in
    if (this.retractSword) {
      if (this.chain.front < 0) {
        game.physics.p2.removeConstraint(this.chain.segs[this.chain.segs.length-1].joint)
        player.chain.sword.kill()
        player.chain = null
        this.retractSword = false
        return
      }
      var front = this.chain.segs[this.chain.front].link
      var angle = game.math.angleBetween(front.x, front.y, this.x, this.y)
      front.body.force.x = Math.cos(angle) * 40000
      front.body.force.y = Math.sin(angle) * 40000
      var dist = game.math.distance(this.x, this.y, front.x, front.y)
      // console.log(this.chain.front, dist)
      if (game.math.distance(this.x, this.y, front.x, front.y) < 24) {
        game.physics.p2.removeConstraint(front.joint)
        front.kill()
        this.chain.front--
        // if (seg.link) {
        //   front.joint = game.physics.p2.createRevoluteConstraint(seg.link, [0, 0], player, [0, 0], maxForce)
      }
    }
  };

  player.shootChain = function(dirX, dirY) {
    var lastSeg;
    var height = 5
    var width = 10
    var maxForce = 2000000
    var length = 10
    var state = game.state.getCurrentState()

    // sword
    var sword = game.add.sprite(this.x, this.y, 'sword')
    game.physics.p2.enable(sword, false);
    sword.body.mass = 200
    sword.body.setCollisionGroup(state.chainCollisionGroup)
    sword.body.collides([state.groundCollisionGroup])
    sword.anchor.set(0.5, 0.5)
    sword.tint = this.team
    sword.body.allowGravity = false
    sword.body.fixedRotation = true
    sword.done = false
    sword.update = function () {
      if (!this.hitGround) {
        sword.body.velocity.x = 450 * dirX
        sword.body.moveUp(30)
      }
    }
    sword.body.onBeginContact.add(function (body, shapeA, shapeB, equation) {
      if (!this.done && !this.hitGround && shapeB.material.name == 'ground') {
        this.hitGround = true
        this.body.velocity.x = 0
        game.state.getCurrentState().spawnOmniDust(this.x, this.y)
        this.lock = game.physics.p2.createRevoluteConstraint(this.body, [0, 0], body, [0, 0], 1000000);
        this.body.allowGravity = true
        this.done = true
      }
    }, sword)

    var segs = []
    var plrJoint

    for (var i = 0; i <= length; i++)
    {
      var x = this.x + this.width * 0.5 + i
      var y = this.y

      newSeg = game.add.sprite(x, y, 'chain')
      game.physics.p2.enable(newSeg, false);
      // newSeg.body.setCircle(5)
      newSeg.body.setMaterial(state.chainMaterial)
      newSeg.body.setCollisionGroup(state.chainCollisionGroup)
      newSeg.body.collides([state.groundCollisionGroup])
      newSeg.tint = this.team
      // newSeg.body.debug = true

      if (i === 0) {
        joint = game.physics.p2.createRevoluteConstraint(newSeg, [0, -width], sword, [-8, 0], maxForce);
        newSeg.body.mass = 1
      }
      else {  
        newSeg.body.mass = 1 / i
      }
      newSeg.body.mass = 1

      var joint = null

      if (lastSeg) {
        joint = game.physics.p2.createRevoluteConstraint(newSeg, [0, -width], lastSeg, [0, width], maxForce);
      }

      if (i == length) {
        segs[length+1] = {
          link: null,
          joint: game.physics.p2.createRevoluteConstraint(newSeg, [0, width], player, [-width, 0], maxForce)
        }
      }

      segs[i] = {
        link: newSeg,
        joint: joint
      }

      lastSeg = newSeg;
    }

    player.chain = {}
    player.chain.segs = segs
    player.chain.front = length
    player.chain.sword = sword
    player.chain.detach = function () {
      game.physics.p2.removeConstraint(sword.lock)
      sword.lock = null
      sword.body.mass = 5
      sword.body.fixedRotation = false
      sword.body.allowGravity = true

      player.retractSword = true

      // // remove links one by one
      // var delay = 0
      // for (var i=length+1; i > 0; i--) {
      //   var lastSeg = segs[i-1]
      //   var seg = segs[i];
      //   (function (lastSeg, seg) {
      //     // console.log('1', i, delay)
      //     game.time.events.add(delay, function() {
      //       game.physics.p2.removeConstraint(lastSeg.joint)
      //       game.physics.p2.removeConstraint(seg.joint)
      //       lastSeg.link.kill()
      //       if (seg.link) {
      //         seg.joint = game.physics.p2.createRevoluteConstraint(seg.link, [0, 0], player, [0, 0], maxForce)
      //       }
      //     })
      //   })(lastSeg, seg);
      //   delay += 1000
      // }
    }
  };
};


PlayState.prototype.update = function() {

  if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT) && this.player.body.velocity.x < 6) {
    this.player.body.force.x = -this.player.walkForce;
    this.player.scale.x = -1;
    this.player.sword.scale.x = -1;
  }
  else if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT) && this.player.body.velocity.x > -6) {
    this.player.body.force.x = this.player.walkForce;
    this.player.scale.x = 1;
    this.player.sword.scale.x = 1;
  } else {
    this.player.body.force.x = 0
  }

  this.player.update();

  if (game.input.keyboard.justPressed(Phaser.Keyboard.SPACEBAR)) {
    if (!this.player.chain) {
      this.player.shootChain(this.player.scale.x, 0)
      this.player.fireCountdown = this.player.fireDelay;
      game.gun.play();
    } else if (this.player.chain && !this.player.retractSword && this.player.fireCountdown <= 0) {
      this.player.chain.detach()
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

PlayState.prototype.spawnOmniDust = function(x, y) {
  for (var i=0; i < 6; i++) {
    var dust = game.state.getCurrentState().spawnDust(x, y)
    var ang = Math.random() * Math.PI * 2
    dust.body.velocity.x = Math.cos(ang) * game.rnd.between(25, 50)
    dust.body.velocity.y = Math.sin(ang) * game.rnd.between(25, 50)
  }
}

// based on example code from http://phaser.io/examples/v2/p2-physics/chain
PlayState.prototype.createRope = function (length, xAnchor, yAnchor) {
  var lastRect;
  var height = 4;        //  Height for the physics body - your image height is 8px
  var width = 4;         //  This is the width for the physics body. If too small the rectangles will get scrambled together.
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
        // newRect.body.static = true;
    }
    else
    {  
        //  Anchor the first one created
        newRect.body.velocity.x = -40;      //  Give it a push :) just for fun
        newRect.body.mass = length / i;     //  Reduce mass for evey rope element
    }

    //  After the first rectangle is created we can add the constraint
    if (lastRect)
    {
        game.physics.p2.createRevoluteConstraint(newRect, [0, -5], lastRect, [0, 5], maxForce);
    }

    lastRect = newRect;
  }
}

var w = 160 * 4;
var h = 144 * 4;
var game = new Phaser.Game(w, h, Phaser.AUTO, 'monochain');
game.state.add('play', PlayState);
game.state.start('play');
