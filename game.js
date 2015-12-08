// so fight me, pff
var chains

var worldBody

var players = []

var Throw = {
  Ready: 1,
  Thrown: 2,
  Locked: 3,
  PullingSelf: 4,
  PullingSword: 5,
  Slashing: 6,
  NoSword: 7,
  Dead: 8
}

function PlayState(game) {
}

PlayState.prototype.preload = function() {
  console.log('preload');

  game.load.image('star_small', 'assets/graphics/_star_small.png');
  game.load.image('star_big', 'assets/graphics/_star_big.png');

  game.load.spritesheet('dust', 'assets/graphics/_dust.png', 8, 8);

  game.load.tilemap('level1', 'assets/maps/sgunn.json', null, Phaser.Tilemap.TILED_JSON);
  game.load.image('tileset', 'assets/graphics/_tileset.png');

  game.load.spritesheet('player', 'assets/graphics/_player.png', 10*2, 16*2);
  game.load.spritesheet('player_sword', 'assets/graphics/_sword.png', 17*2, 16*2);
  game.load.image('player_sword_slash', 'assets/graphics/_sword_slash.png')
  game.load.image('sword', 'assets/graphics/_raw_sword.png');

  game.load.image('chain', 'assets/graphics/_chain_segment.png')
  game.load.image('chain_particle', 'assets/graphics/_chain_particle.png')
  game.load.image('1x1_particle', 'assets/graphics/_1x1_particle.png')

    game.load.image('textbox', 'assets/graphics/_textbox.png');

  game.load.audio('gun', 'assets/sounds/gun.wav');
  game.load.audio('jump', 'assets/sounds/jump.wav');

  game.scale.pageAlignHorizontally = true;
  game.scale.pageAlignVertically = true;
  game.scale.refresh();
};

PlayState.prototype.create = function() {
  console.log('create');

  game.input.gamepad.start();

  game.physics.startSystem(Phaser.Physics.P2JS);
  game.physics.p2.gravity.y = 900;
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

  this.spawns = []
  var spawns = this.spawns;
  if (this.map.objects.Respawns) {
    this.map.objects.Respawns.forEach(function(spawn, b, c) {
      spawns.push({
        x: spawn.x,
        y: spawn.y
      })
    });
  }

  this.groundMaterial = game.physics.p2.createMaterial('ground');
  this.playerMaterial = game.physics.p2.createMaterial('player');
  this.chainMaterial = game.physics.p2.createMaterial('chain');
  var groundPlayerCM = game.physics.p2.createContactMaterial(this.groundMaterial, this.playerMaterial)
  groundPlayerCM.friction = 1.0
  groundPlayerCM.restitution = 0.15
  groundPlayerCM.stiffness = 1e7
  var groundChainCM = game.physics.p2.createContactMaterial(this.groundMaterial, this.chainMaterial)
  groundChainCM.friction = 0.3
  groundChainCM.restitution = 0.5

  // sword group
  this.swords = game.add.group()

  this.fg = this.map.createLayer('FG');
  this.map.setCollisionBetween(1, 400, true, this.fg);
  this.fg.resizeWorld();
  var tiles = game.physics.p2.convertTilemap(this.map, this.fg)
    var that = this
    tiles.forEach(function (tile) {
        tile.setCollisionGroup(that.groundCollisionGroup)
        tile.collides([that.playerCollisionGroup, that.chainCollisionGroup])
        tile.setMaterial(that.groundMaterial)
        // tile.debug = true
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

  worldBody = game.add.sprite(0, 0, 'star_small')
  game.physics.p2.enable(worldBody);
  worldBody.body.static = true
  worldBody.body.debug = true

  players[0] = this.createPlayer(spawns[0].x, spawns[0].y, 0xFF0000)
  players[0].input = {
        gamepad: game.input.gamepad.pad1,
        up: Phaser.Keyboard.UP,
        down: Phaser.Keyboard.DOWN,
        left: Phaser.Keyboard.LEFT,
        right: Phaser.Keyboard.RIGHT,
        jump: Phaser.Keyboard.Z,
        shoot: Phaser.Keyboard.X
  };
  injectInput(players[0].input)

  players[1] = this.createPlayer(spawns[1].x, spawns[1].y, 0x00FF00)
  players[1].input = {
        gamepad: game.input.gamepad.pad2,
        up: Phaser.Keyboard.W,
        down: Phaser.Keyboard.S,
        left: Phaser.Keyboard.A,
        right: Phaser.Keyboard.D,
        jump: Phaser.Keyboard.O,
        shoot: Phaser.Keyboard.P
  };
  injectInput(players[1].input)

  if (game.input.gamepad.pad3.connected) {
    players[2] = this.createPlayer(spawns[2].x, spawns[2].y, 0xFF00FF)
    players[2].input = {
      gamepad: game.input.gamepad.pad3,
      // up: Phaser.Keyboard.UP,
      // down: Phaser.Keyboard.DOWN,
      // left: Phaser.Keyboard.LEFT,
      // right: Phaser.Keyboard.RIGHT,
      // jump: Phaser.Keyboard.Z,
      // shoot: Phaser.Keyboard.X
    };
    injectInput(players[2].input)
  }

  if (game.input.gamepad.pad4.connected) {
    players[3] = this.createPlayer(spawns[3].x, spawns[3].y, 0xFFFF00)
    players[3].input = {
      gamepad: game.input.gamepad.pad4,
      // up: Phaser.Keyboard.UP,
      // down: Phaser.Keyboard.DOWN,
      // left: Phaser.Keyboard.LEFT,
      // right: Phaser.Keyboard.RIGHT,
      // jump: Phaser.Keyboard.Z,
      // shoot: Phaser.Keyboard.X
    };
    injectInput(players[3].input)
  }
}

PlayState.prototype.createPlayer = function(x, y, team) {
  var spawns = game.state.getCurrentState().spawns

  var player = game.add.sprite(x, y, 'player');
  player.swordState = Throw.Ready
  player.animations.add('idle', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 10, true);
  player.animations.add('jump_upward', [2], 10, false);
  player.animations.add('jump_downward', [3], 10, false);
  player.animations.play('idle');
  player.anchor.set(0.4, 0.5);
  game.physics.p2.enable(player);
  player.body.setMaterial(this.playerMaterial)
  player.body.fixedRotation = true
  // player.body.setCircle(15, 5, 0)
  player.body.setCollisionGroup(this.playerCollisionGroup)
  player.body.collides([this.groundCollisionGroup])
  // player.body.debug = true
  player.body.mass = 10
  player.body.collideWorldBounds = true;
  player.walkForce = 40000;
  player.jumpForce = 360;
  player.fireDelay = 250;
  player.fireCountdown = 0;
  player.team = team
  player.jumpCountdown = 0
  player.psychicCountdown = 0

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

  player.onSideWall = function() {
    var yAxis = [1, 0]
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
        if (d > 0.5 || d < -0.5)
        {
          result = true;
        }
      }
    }
    return (!result ? false : d)
  }

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

  player.slash = function() {
    var slash = game.add.sprite(this.x + this.scale.x * 8, this.y, 'player_sword_slash');
    slash.anchor.set(0.5, 0.5);
    game.physics.p2.enable(slash)
    // slash.body.setCollisionGroup(this.slashCollisionGroup)
    slash.body.collides([])
    slash.body.kinematic = true
    slash.body.allowGravity = false
    slash.tint = this.team
    slash.scale.x = this.scale.x
    // slash.scale.x *= 2.5
    // slash.scale.y *= 1.5

    var dirX = this.scale.x
    var lifetime = 0.06

    this.slashSprite = slash
    this.swordState = Throw.Slashing

    slash.update = function () {
      this.body.moveRight(dirX * 512)
      // this.body.moveDown(dirX * 64)
      this.scale.x *= 1.1
      this.scale.y *= 1.01
      lifetime -= game.time.physicsElapsed
      if (lifetime <= 0) {
        player.slashSprite = null
        player.swordState = Throw.Ready
        console.log('foo')
        this.destroy()
      }
    }
  }

  player.jump = function() {
    if (this.canJump()) {
      this.body.moveUp(this.jumpForce)
      // this.body.velocity.y = -this.jumpForce;
      this.jumpCountdown = 500
      // game.jump.play();
      game.state.getCurrentState().spawnJumpDust(this.x, this.y + this.height * 0.5)
    }
    if (!this.canJump() && this.onSideWall() && this.jumpCountdown < 0) {
      this.body.moveUp(this.jumpForce)
      this.jumpCountdown = 500
      game.state.getCurrentState().spawnJumpDust(this.x, this.y + this.height * 0.5)
    }
  };

  player.update = function() {
    this.sword.visible = (this.swordState === Throw.Ready && this.visible)

    // check for other swords hitting us
    for (var i=0; i < players.length; i++) {
      if (players[i] !== this) {
        var player = players[i]
        if (player.chain) {
          var dist = game.math.distance(this.x, this.y, player.chain.sword.x, player.chain.sword.y)
          if (dist <= 16 && this.visible) {
            var that = this
            this.swordState = Throw.Dead
            gameFreeze(0.15, function() {
              game.paused = false
              if (that.looseSword) {
                var sword = that.looseSword
                that.looseSword = null
                var tween = game.add.tween(sword).to({alpha: 0}, 1000)
                tween.onComplete.add(function() {
                  this.destroy()
                }, sword)
                tween.start()
              }
              player.chain.detach()
              if (that.chain) {
                if (that.chain.sword.lock) {
                  game.physics.p2.removeConstraint(that.chain.sword.lock)
                }
                that.chain.sprite.kill()
                that.chain.sword.kill()
                that.chain = null
              }
              game.state.getCurrentState().spawnDeathDust(that)
              for (var i=0; i < 20; i++) {
                var seg = game.state.getCurrentState().spawnTinyParticle(that.x, that.y)
                seg.tint = that.team
                // seg.alpha = 0.6
                var rot = Math.random() * Math.PI * 2
                var force = Math.random() * 800
                seg.body.velocity.x += Math.cos(rot) * force*0.3 + Math.cos(player.chain.sword.rotation) * force
                seg.body.velocity.y += Math.sin(rot) * force*0.3 + Math.sin(player.chain.sword.rotation) * force
              }
              that.visible = false
              that.body.x = -10000
              that.body.y = -10000
              that.x = -10000
              that.y = -10000
            })
            game.time.events.add(5000, function() {
              var spawn = spawns[Math.floor(Math.random() * spawns.length)]
              this.body.x = spawn.x
              this.body.y = spawn.y
              this.fireCountdown = 500
              this.swordState = Throw.Ready
              this.body.velocity.x = 0
              this.body.velocity.y = 0
              this.visible = true
            }, this);
            break
          }
        }
      }
    }

    // check for sword vs sword collisions
    if (this.chain) {
      for (var i=0; i < players.length; i++) {
        if (players[i] !== this && players[i].chain && players[i].chain.sword) {
          var player = players[i]
          var dist = game.math.distance(player.chain.sword.x, player.chain.sword.y, this.chain.sword.x, this.chain.sword.y)
          if (dist <= 17 && !this.chain.hit) {
            if (!player.chain.sword.lock) {
              player.chain.detach()
              player.chain.hit = true
            }
            if (!this.chain.sword.lock) {
              this.chain.detach()
              this.chain.hit = true
            }
            game.state.getCurrentState().spawnOmniDust(this.chain.sword.x, this.chain.sword.y)
            break
          }
        }
      }
    }

    // check for other swords colliding with my chain
    if (this.chain) {
      // step along player->sword line, checking distance along the way to each sword
      var start = [this.x, this.y]
      var end = [this.chain.sword.x, this.chain.sword.y]
      var step = [end[0] - start[0], end[1] - start[1]]
      var len = Math.sqrt(step[0]*step[0] + step[1]*step[1])
      if (len > 0) {
        var STEP_SIZE = 16
        step[0] = (step[0] / len) * STEP_SIZE
        step[1] = (step[1] / len) * STEP_SIZE
        var steps = len / STEP_SIZE
        for (var i=0; i < players.length; i++) {
          if (players[i] !== this && players[i].chain && !this.chain.hit) {
            var player = players[i]
            if (player.chain) {
              var pos = [start[0], start[1]]
              var done = false
              for (var i=0; i < steps && !done; i++) {
                var dist = game.math.distance(pos[0], pos[1], player.chain.sword.x, player.chain.sword.y)
                if (dist <= 10) {
                  var that = this
                  this.chain.hit = true
                  gameFreeze(0.1, function() {
                    game.state.getCurrentState().spawnLandingDust(player.chain.sword.x, player.chain.sword.y)
                    player.chain.reelIn()
                    player.chain.detach()
                    if (that.chain) {
                      // spawn broken chain fragments
                      var steps = 0
                      stepAlongLineSeg(start, end, STEP_SIZE / 2, function (x, y) {
                        var seg = game.state.getCurrentState().spawnChainSeg(x, y)
                        seg.tint = that.team
                        seg.alpha = 0.6
                        var dist = game.math.distance(x, y, player.chain.sword.x, player.chain.sword.y) + 0.01
                        var impact = 50 - dist/5
                        impact = Math.max(0, impact * 15)
                        seg.body.velocity.x += Math.cos(player.chain.sword.rotation) * impact + game.rnd.between(-5, 5)
                        seg.body.velocity.y += Math.sin(player.chain.sword.rotation) * impact + game.rnd.between(-5, 5)
                        seg.lifetime = 3 + steps * 0.02
                        steps++
                        return true
                      })

                      that.chain.sprite.kill()

                      // create new 'sword pickup' object at old sword's coords
                      var sword = game.add.sprite(that.chain.sword.x, that.chain.sword.y, 'sword')
                      game.physics.p2.enable(sword, false);
                      sword.tint = that.team
                      sword.body.mass = 10
                      sword.body.angularVelocity = game.rnd.between(-10, 10)
                      // sword.body.debug = true
                      sword.body.setMaterial(game.state.getCurrentState().chainMaterial)
                      sword.body.setCollisionGroup(game.state.getCurrentState().chainCollisionGroup)
                      sword.body.collides([game.state.getCurrentState().groundCollisionGroup, game.state.getCurrentState().chainCollisionGroup])
                      sword.anchor.set(0.5, 0.5)
                      sword.body.allowGravity = true
                      sword.body.velocity.x += Math.cos(player.chain.sword.rotation) * 450
                      sword.body.velocity.y += Math.sin(player.chain.sword.rotation) * 450
                      that.looseSword = sword
                      sword.update = function () {
                        for (var i=0; i < players.length; i++) {
                          if (players[i].swordState === Throw.NoSword) {
                            var dist = game.math.distance(players[i].x, players[i].y, this.x, this.y)
                            // console.log(dist)
                            if (dist <= 16) {
                              var that = this
                              gameFreeze(0.1, function() {
                                players[i].swordState = Throw.Ready
                                players[i].fireCountdown = 500
                                that.kill()
                                that.destroy()
                              })
                              return
                            }
                          }
                        }
                      }
                      sword.body.onBeginContact.add(function (body, shapeA, shapeB, equation) {
                        if (shapeB.material && shapeB.material.name == 'ground') {
                          if (Math.abs(this.body.velocity.y) > 10) {
                            game.state.getCurrentState().spawnLandingDust(this.x, this.y)
                          }
                        } else {
                          this.body.angularVelocity += 30
                          this.body.velocity.y += -35
                        }
                      }, sword)
                      game.physics.p2.removeConstraint(that.chain.sword.lock)
                      that.chain.sword.kill()
                      that.chain = null
                    }
                    that.swordState = Throw.NoSword
                    done = true
                    return
                  })
                }
                pos[0] += step[0]
                pos[1] += step[1]
              }
            }
          }
        }
      }
    }

    if (this.chain && this.chain.sprite) {
      var sword = this.chain.sword
      var angle = game.math.angleBetween(this.x, this.y, sword.x, sword.y)
      this.chain.sprite.x = this.x
      this.chain.sprite.y = this.y
      this.chain.sprite.angle = angle * (180 / Math.PI)
      var dist = game.math.distance(this.x, this.y, sword.x, sword.y)
      this.chain.sprite.width = dist
    }

    if (this.canJump()) {
      this.animations.play('idle');
      this.sword.animations.play('idle');
    } else if (this.body.velocity.y > 10) {
      this.animations.play('jump_upward');
      this.sword.animations.play('jump_upward');
    } else if (this.body.velocity.y < -10) {
      this.animations.play('jump_downward');
      this.sword.animations.play('jump_downward');
    }
    if (this.swordState === Throw.PullingSelf) {
      this.animations.play('jump_upward');
    }

    if (this.input.isLeft() && this.body.velocity.x < 6) {
      this.body.force.x += -this.walkForce;
      // this.body.moveLeft(100)
      this.scale.x = -1;
      this.sword.scale.x = -1;
    }
    else if (this.input.isRight() && this.body.velocity.x > -6) {
      this.body.force.x += this.walkForce;
      // this.body.moveRight(100)
      this.scale.x = 1;
      this.sword.scale.x = 1;
    } else {
      // this.body.force.x = 0
    }

    if (this.looseSword) {
      this.looseSword.tint = this.team
    }

    // Shoot
    // if (game.input.keyboard.justPressed(this.input.shoot)) {
    if (this.input.isShooting()) {
      // Premature reel-in
      // if (this.swordState === Throw.Thrown && this.fireCountdown <= 100) {
      //   this.chain.reelIn()
      // }
      // Throw sword
      if (this.swordState === Throw.Ready && this.fireCountdown <= 0) {
        var dir = this.getAimDir()
        this.shootChain(dir[0], dir[1])
        this.fireCountdown = this.fireDelay;
        // game.gun.play();
      }
      // Summon sword
      if (this.swordState == Throw.NoSword && (this.psychicCountdown > 0 || (this.psychicCountdown > -3000 && this.wasUsingPsychicLastFrame))) {
        var angle = game.math.angleBetween(this.x, this.y, this.looseSword.x, this.looseSword.y)
        var force = [Math.cos(angle) * -100, Math.sin(angle) * -100]
        // this.looseSword.body.force.x += force[0]
        // this.looseSword.body.force.y += force[1]
        this.looseSword.body.moveRight(force[0])
        this.looseSword.body.moveDown(force[1])
        this.looseSword.tint = 0xFFFFFF
        this.psychicCountdown -= game.time.elapsed
        this.wasUsingPsychicLastFrame = true
      }
    } else {
      this.psychicCountdown += game.time.elapsed * 4
      this.psychicCountdown = Math.min(1, this.psychicCountdown)
    }

    // Detach sword from target
    // if (game.input.keyboard.justReleased(this.input.shoot)) {
    if (!this.input.isShooting() && this.chain) {
      if (this.swordState === Throw.PullingSelf || this.swordState === Throw.PullingSword) {
        this.chain.detach()
      }
    }

    // if (game.input.keyboard.isDown(this.input.shoot)) {
    if (this.input.isShooting()) {
      if (this.chain && this.swordState === Throw.Locked && this.fireCountdown <= 0) {
        this.chain.reelIn()
      }
    }
    this.fireCountdown -= game.time.elapsed;
    this.jumpCountdown -= game.time.elapsed;

    // if (game.input.keyboard.isDown(this.input.jump)) {
    if (this.input.isJumping()) {
      this.jump();
    }

    this.sword.x = this.x - this.anchor.x * this.width + this.body.velocity.x * game.time.physicsElapsed
    this.sword.y = this.y - this.anchor.y * this.height + this.body.velocity.y * game.time.physicsElapsed

    // reel sword back in
    if (this.chain && (this.swordState === Throw.PullingSelf || this.swordState === Throw.PullingSword)) {
      var sword = this.chain.sword
      if (this.swordState === Throw.PullingSelf) {
        this.pullAccum += 20
        var angle = game.math.angleBetween(this.x, this.y, sword.x, sword.y)
        var pullForce = Math.min(400, this.pullAccum)
        if (pullForce < 175) {
          pullForce = 0
        }
        this.body.moveRight(Math.cos(angle) * pullForce)
        this.body.moveDown(Math.sin(angle) * pullForce)
      } else if (this.swordState === Throw.PullingSword) {
        var angle = game.math.angleBetween(sword.x, sword.y, this.x, this.y)
        this.pullAccum += 40
        var pullForce = Math.min(550, this.pullAccum)
        sword.body.moveRight(Math.cos(angle) * pullForce)
        sword.body.moveDown(Math.sin(angle) * pullForce)
        sword.body.rotation = angle - Math.PI
        sword.rotation = angle - Math.PI
      }
      if (game.math.distance(this.x, this.y, sword.x, sword.y) < 21) {
        game.physics.p2.removeConstraint(sword.lock)
        sword.kill()
        sword.destroy()
        this.chain.sprite.kill()
        this.chain.sprite.destroy()
        this.chain = null
        this.swordState = Throw.Ready
        this.fireCountdown = this.fireDelay;
      }
    }
  };

  player.getAimDir = function() {
    var dirX = this.scale.x
    var dirY = 0
    // if (game.input.keyboard.isDown(this.input.up)) {
    if (this.input.isUp()) {
      dirY = -1
      dirX = 0
    }
    // if (game.input.keyboard.isDown(this.input.down)) {
    if (this.input.isDown()) {
      dirY = 1
      dirX = 0
    }
    // if (this.input.isLeft()) {
    //   dirX = -1
    // }
    // if (this.input.isRight()) {
    //   dirX = 1
    // }

    return [dirX, dirY]
  }

  player.shootChain = function(dirX, dirY) {
    this.pullAccum = 0
    var lastSeg;
    var height = 5
    var width = 10
    var maxForce = 2000000
    var length = 15
    var state = game.state.getCurrentState()

    this.swordState = Throw.Thrown

    // sword
    var sword = game.state.getCurrentState().swords.create(this.x, this.y, 'sword')
    game.physics.p2.enable(sword, false);
    sword.body.mass = 200
    sword.body.setRectangle(16, 16, 0, 0)
    sword.body.setCollisionGroup(state.chainCollisionGroup)
    sword.body.collides([state.groundCollisionGroup, state.chainCollisionGroup])
    sword.anchor.set(0, 0.5)
    sword.tint = this.team
    sword.body.allowGravity = false
    sword.body.fixedRotation = true
    sword.done = false
    // sword.body.debug = true
    var SWORD_SPEED = 650
    sword.update = function () {
      if (!this.hitGround) {
        sword.body.moveRight(SWORD_SPEED * dirX)
        sword.body.moveDown(SWORD_SPEED * dirY - 20)

        var angle = game.math.angleBetween(this.x, this.y, player.x, player.y)
        sword.body.rotation = angle - Math.PI
        sword.rotation = angle - Math.PI
      }
    }
    sword.body.onBeginContact.add(function (body, shapeA, shapeB, equation) {
      if (!this.done && !this.hitGround && shapeB.material && shapeB.material.name === 'ground') {
        // console.log(equation)
        // var swordDir = [dirX, dirY]
        // var dot1 = p2.vec2.dot(equation[0].normalA, swordDir)
        // var dot2 = p2.vec2.dot(equation[1].normalA, swordDir)
        // console.log(dot1)
        // console.log(dot2)
        // console.dir(equation[0])
        // console.dir(equation[1])
        // if (1===1 || dot1 === 1 || dot2 === 1) {
          this.hitGround = true
          game.state.getCurrentState().spawnOmniDust(this.x, this.y)
          var maxForce = 2000000
          this.lock = game.physics.p2.createRevoluteConstraint(this.body, [0, 0], worldBody, [this.x - dirX*10, this.y - dirY*10], maxForce);
          this.body.allowGravity = false
          this.done = true
          player.swordState = Throw.Locked
        // }
      }
    }, sword)

    var chain = this.game.add.tileSprite(player.x, player.y, 128, 9, 'chain');
    chain.anchor.set(0, 0.5)
    chain.tint = player.team

    player.chain = {}
    player.chain.sprite = chain

    player.chain.sword = sword
    player.chain.reelIn = function () {
      player.swordState = Throw.PullingSelf
    }
    player.chain.detach = function () {
      if (sword.lock) {
        game.physics.p2.removeConstraint(sword.lock)
      }
      sword.hitGround = true
      sword.lock = null
      sword.body.mass = 5
      sword.body.fixedRotation = true
      sword.body.allowGravity = true
      player.swordState = Throw.PullingSword

      sword.body.collides([])
    }

    if (dirY < 0) {
      sword.body.angle = -90
      sword.angle = -90
    }
    if (dirY > 0) {
      sword.body.angle = 90
      sword.angle = 90
    }
  };

  return player
};


PlayState.prototype.update = function() {

  for (var i in players) {
    players[i].update()
  }

  // Slash
  // if (game.input.keyboard.justPressed(Phaser.Keyboard.C) && this.player.swordState === Throw.Ready && this.player.fireCountdown <= 0) {
  //   this.player.slash()
  //   this.player.fireCountdown = 2
  // }

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

PlayState.prototype.spawnLandingDust = function(x, y, rot) {
  rot = rot || 0
  for (var i=0; i < 6; i++) {
    var dust = game.state.getCurrentState().spawnDust(x, y)
    dust.body.velocity.x = Math.cos(rot) * (i < 3 ? -1 : 1) * game.rnd.between(30, 40) + Math.cos(rot-Math.PI/2) * 20
    dust.body.velocity.y = Math.sin(rot) * (i < 3 ? -1 : 1) * game.rnd.between(30, 40) + Math.sin(rot-Math.PI/2) * 20
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

PlayState.prototype.spawnDeathDust = function(player) {
  for (var i=0; i < 10; i++) {
    var dust = game.state.getCurrentState().spawnDust(player.x, player.y)
    var ang = Math.random() * Math.PI * 2
    dust.body.velocity.x = Math.cos(ang) * game.rnd.between(25, 75)
    dust.body.velocity.y = Math.sin(ang) * game.rnd.between(25, 75)
    dust.tint = player.team
  }
}

PlayState.prototype.spawnChainSeg = function(x, y) {
  var chain = game.add.sprite(x, y, 'chain_particle')
  game.physics.p2.enable(chain, false);
  chain.body.mass = 1
  chain.body.setCircle(6)
  chain.body.angularVelocity = game.rnd.between(-5, 5)
  chain.body.velocity.y = 50
  // chain.body.debug = true
  chain.body.setMaterial(game.state.getCurrentState().chainMaterial)
  chain.body.setCollisionGroup(game.state.getCurrentState().chainCollisionGroup)
  chain.body.collides([game.state.getCurrentState().groundCollisionGroup])
  chain.anchor.set(0.5, 0.5)
  chain.body.allowGravity = true


  chain.lifetime = 5
  var fading = false
  chain.update = function () {
    this.lifetime -= game.time.physicsElapsed
    if (this.lifetime < 0.5) {
      if (!fading) {
        game.add.tween(chain).to({alpha: 0}, 500).start();
        fading = true
      }
    }
    if (this.lifetime < 0) {
      // game.state.getCurrentState().spawnOmniDust(this.x, this.y)
      this.destroy()
    }
  }

  // chain.body.onBeginContact.add(function (body, shapeA, shapeB, equation) {
  //   game.state.getCurrentState().spawnLandingDust(this.x, this.y + this.height * 0.5 - 4)
  //   this.destroy()
  // }, chain)

  return chain
}

PlayState.prototype.spawnTinyParticle = function(x, y) {
  var chain = game.add.sprite(x, y, '1x1_particle')
  game.physics.p2.enable(chain, false);
  chain.body.mass = 1
  chain.scale.set(2, 2)
  chain.body.setCircle(4)
  chain.body.setMaterial(game.state.getCurrentState().chainMaterial)
  chain.body.setCollisionGroup(game.state.getCurrentState().chainCollisionGroup)
  chain.body.collides([game.state.getCurrentState().groundCollisionGroup])
  chain.anchor.set(0.5, 0.5)
  chain.body.allowGravity = true

  chain.lifetime = 3
  var fading = false
  chain.update = function () {
    this.lifetime -= game.time.physicsElapsed
    if (this.lifetime < 0.5) {
      if (!fading) {
        game.add.tween(chain).to({alpha: 0}, 500).start();
        fading = true
      }
    }
    if (this.lifetime < 0) {
      this.destroy()
    }
  }

  return chain
}

function stepAlongLineSeg(start, end, STEP_SIZE, cb) {
  var step = [end[0] - start[0], end[1] - start[1]]
  var len = Math.sqrt(step[0]*step[0] + step[1]*step[1])
  var pos = [start[0], start[1]]
  if (len > 0) {
    var STEP_SIZE = 16
    step[0] = (step[0] / len) * STEP_SIZE
    step[1] = (step[1] / len) * STEP_SIZE
    var steps = len / STEP_SIZE
    for (var i=0; i < steps; i++) {
      var ret = cb(pos[0], pos[1])
      if (!ret) { break }
      pos[0] += step[0]
      pos[1] += step[1]
    }
  }
}

function gameFreeze(duration, cb) {
  game.paused = true
  setTimeout(function() {
    game.paused = false
    cb()
  }, duration * 1000)
}

var w = 160 * 4;
var h = 144 * 4;
var game = new Phaser.Game(w, h, Phaser.AUTO, 'monochain');
game.state.add('play', PlayState);
game.state.start('play');

// samurai gunn: 22x16

Phaser.TileSprite.prototype.kill = function() {

    this.stopScroll();
    this.alive = false;
    this.exists = false;
    this.visible = false;

    if (this.events)
    {
        this.events.onKilled.dispatch(this);
    }

    return this;
};

var DEAD_ZONE = 0.5

function injectInput(input) {
  input.isJumping = function() {
    return game.input.keyboard.isDown(this.jump)
        || (this.gamepad && this.gamepad.connected
        && this.gamepad._buttons[0].isDown);
  };
  input.isShooting = function() {
    return game.input.keyboard.isDown(this.shoot)
        || (this.gamepad && this.gamepad.connected
        && this.gamepad._buttons[1].isDown);
  };
  input.isLeft = function() {
    return game.input.keyboard.isDown(this.left) || (this.gamepad && this.gamepad.connected && this.gamepad._axes[0] < -DEAD_ZONE)
  }
  input.isRight = function() {
    return game.input.keyboard.isDown(this.right) || (this.gamepad && this.gamepad.connected && this.gamepad._axes[0] > DEAD_ZONE)
  }
  input.isUp = function() {
    return game.input.keyboard.isDown(this.up) || (this.gamepad && this.gamepad.connected && this.gamepad._axes[1] < -DEAD_ZONE)
  }
  input.isDown = function() {
    return game.input.keyboard.isDown(this.down) || (this.gamepad && this.gamepad.connected && this.gamepad._axes[1] > DEAD_ZONE)
  }
}
