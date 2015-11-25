// so fight me, pff
var chains

function PlayState(game) {
}

PlayState.prototype.preload = function() {
  console.log('preload');

  game.load.image('star_small', 'assets/graphics/_star_small.png');
  game.load.image('star_big', 'assets/graphics/_star_big.png');

  game.load.tilemap('level1', 'assets/maps/test.json', null, Phaser.Tilemap.TILED_JSON);
  game.load.image('tileset', 'assets/graphics/_tileset.png');

  game.load.spritesheet('player', 'assets/graphics/_player.png', 17*2, 16*2);
  game.load.spritesheet('sword', 'assets/graphics/_sword.png', 17*2, 16*2);

  game.load.spritesheet('chain', 'assets/graphics/_chain_segment.png', 5*2, 5*2);

  game.load.image('textbox', 'assets/graphics/_textbox.png');

  game.load.audio('gun', 'assets/sounds/gun.wav');
  game.load.audio('jump', 'assets/sounds/jump.wav');
  game.load.audio('title', 'assets/music/title.mp3');

  game.scale.pageAlignHorizontally = true;
  game.scale.pageAlignVertically = true;
  game.scale.refresh();
};

PlayState.prototype.create = function() {
  console.log('create');

  game.physics.startSystem(Phaser.Physics.ARCADE);
  game.physics.arcade.gravity.y = 1350;
  game.physics.arcade.TILE_BIAS = 40;

  game.gun = game.add.audio('gun');
  game.jump = game.add.audio('jump');

  // game.music = game.add.audio('title');
  // game.music.play('', 0, 1, true);

  // game.stage.smoothed = false;
  // game.world.setBounds(0, 0, 2000, 2000);
  // game.camera.setBoundsToWorld();

  this.map = game.add.tilemap('level1');
  this.map.addTilesetImage('_tileset', 'tileset');
  this.bg = this.map.createLayer('BG');

  var stars = game.add.group();

  this.fg = this.map.createLayer('FG');
  this.map.setCollisionBetween(1, 300, true, this.fg);
  this.fg.resizeWorld();

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

  chains = game.add.group();

  var player = game.add.sprite(16*2, 96*2, 'player');
  player.animations.add('idle', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 10, true);
  player.animations.add('jump_upward', [2], 10, false);
  player.animations.add('jump_downward', [3], 10, false);
  player.animations.play('idle');
  player.anchor.set(0.4, 0.5);
  game.physics.enable(player);
  player.body.bounce.set(0.1, 0.03);
  player.body.collideWorldBounds = true;
  player.body.drag.set(2000, 0);
  player.body.maxVelocity.x = 150;
  player.body.setSize(8*2, 12*2, 0*2, 2*2);
  player.walkForce = 1500;
  player.jumpForce = 500;
  player.fireDelay = 150;
  player.fireCountdown = 0;
  player.team = 0xFF0000;
  this.player = player;

  var sword = game.add.sprite(16*2, 96*2, 'sword');
  sword.animations.add('idle', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 10, true);
  sword.animations.add('jump_upward', [2], 10, false);
  sword.animations.add('jump_downward', [3], 10, false);
  sword.animations.play('idle');
  sword.tint = player.team
  player.anchor.set(0.4, 0.5);
  player.sword = sword;

  player.canJump = function() {
    return this.body.onFloor() || this.body.touching.down;
  };

  player.jump = function() {
    if (this.canJump()) {
      this.body.velocity.y = -this.jumpForce;
      game.jump.play();
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
      game.physics.enable(chain);
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
  game.physics.arcade.collide(this.player, this.fg)
  game.physics.arcade.collide(chains, this.fg, function(chain, tile) {
      chain.body.velocity.x *= 0.96
      chain.body.velocity.y *= 0.96
    });

  this.player.body.acceleration.x = 0;
  if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT)) {
    this.player.body.acceleration.x = -this.player.walkForce;
    this.player.scale.x = -1;
    this.player.sword.scale.x = -1;
  }
  if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)) {
    this.player.body.acceleration.x = this.player.walkForce;
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

  if (game.input.keyboard.justPressed(Phaser.Keyboard.UP)) {
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





var w = 160 * 4;
var h = 144 * 4;
var game = new Phaser.Game(w, h, Phaser.AUTO, 'monochain');
game.state.add('play', PlayState);
game.state.start('play');
