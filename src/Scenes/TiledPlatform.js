class TiledPlatform extends Phaser.Scene {
    constructor() {
        super("tiledPlatformScene");

        // variables and settings
        this.ACCELERATION = 500;
        this.MAX_X_VEL = 200;   // pixels/second
        this.MAX_Y_VEL = 2000;
        this.DRAG = 600;    
        this.JUMP_VELOCITY = -650;
    }

    preload() {
        // load assets
        this.load.path = "./assets/";
        this.load.spritesheet("kenney_sheet", "colored_transparent_packed.png", {
            frameWidth: 16,
            frameHeight: 16
        });
        this.load.tilemapTiledJSON("platform_map", "tilemap02.json");    // Tiled JSON file
    }

    create() {
        // add a tilemap
        const map = this.add.tilemap("platform_map");
        // add a tileset to the map
        const tileset = map.addTilesetImage("colored_packed", "1bit_tiles");
        // create tilemap layers
        const backgroundLayer = map.createLayer("Background", tileset, 0, 0);
        const groundLayer = map.createLayer("Ground", tileset, 0, 0);
        const sceneryLayer = map.createLayer("Scenery", tileset, 0, 0);
        
        // set map collision (two styles: uncomment *one* of the two lines below)
        //groundLayer.setCollision([19, 20, 21, 67, 69, 120]);
        groundLayer.setCollisionByProperty({ 
            collides: true 
        });
        
        // define a render debug so we can see the tilemap's collision bounds
        // const debugGraphics = this.add.graphics().setAlpha(0.75);
        // groundLayer.renderDebug(debugGraphics, {
        //     tileColor: null,    // color of non-colliding tiles
        //     collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),    // color of colliding tiles
        //     faceColor: new Phaser.Display.Color(40, 39, 37, 255)                // color of colliding face edges
        // });

        // setup player
        // place player on map from Tiled object layer data
        // .findObject(objectLayer, callback [, context])
        // "Find the first object in the given object layer that satisfies the provided testing function. I.e. finds the first object for which callback returns true."
        const p1Spawn = map.findObject("Objects", obj => obj.name === "P1 Spawn");
        this.p1 = this.physics.add.sprite(p1Spawn.x, p1Spawn.y, "kenney_sheet", 450);
        // set player physics properties
        this.p1.body.setSize(this.p1.width/2);
        this.p1.body.setMaxVelocity(this.MAX_X_VEL, this.MAX_Y_VEL);
        this.p1.body.setCollideWorldBounds(true);
        
        // player animations
        this.anims.create({
            key: 'jump',
            defaultTextureKey: 'kenney_sheet',
            frames: [ 
                { frame: 453 },
            ],
            repeat: -1
        });

        this.anims.create({
            key: 'walk',
            defaultTextureKey: 'kenney_sheet',
            frames: [ 
                { frame: 450 },
                { frame: 451 },
                { frame: 452 }
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            defaultTextureKey: 'kenney_sheet',
            frames: [ 
                { frame: 450 },
            ]
        });

        // init player animation
        this.p1.anims.play('idle');

        // generate coin objects from object data
        // https://newdocs.phaser.io/docs/3.54.0/Phaser.Tilemaps.Tilemap#createFromObjects
        // .createFromObjects(objectLayerName, config)
        this.coins = map.createFromObjects("Objects", {
            name: "coin",
            key: "kenney_sheet",
            frame: 214
        });

        // for simplicity's sake, we'll add physics to the coins manually
        // https://newdocs.phaser.io/docs/3.54.0/Phaser.Physics.Arcade.World#enable        
        // second parameter is 0: DYNAMIC_BODY or 1: STATIC_BODY
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        // now use JS .map method to set a more accurate circle body on each sprite
        this.coins.map((coin) => {
            coin.body.setCircle(4).setOffset(4, 4); 
        });
        // then add the coins to a group
        this.coinGroup = this.add.group(this.coins);
        this.bluePowerUps = map.createFromObjects("Objects", {
            name: "bluePowerUp",
            key: "kenney_sheet",
            frame: 513
        });
        this.physics.world.enable(this.bluePowerUps, Phaser.Physics.Arcade.STATIC_BODY);
        this.bluePowerUpGroup = this.add.group(this.bluePowerUps);

        // set gravity and physics world bounds (so collideWorldBounds works)
        this.physics.world.gravity.y = 2000;
        this.physics.world.bounds.setTo(0, 0, map.widthInPixels, map.heightInPixels);

        // create collider(s)/overlap(s)
        this.physics.add.collider(this.p1, groundLayer);
        this.physics.add.overlap(this.p1, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
        });
        this.powerUpVfxManager = this.add.particles('kenney_sheet', 215);

        this.powerUpVfxEffect = this.powerUpVfxManager.createEmitter({
            follow: this.p1,
            quantity: 20,
            scale: {start: 1.0, end: 0.0},  // start big, end small
            speed: {min: 50, max: 100}, // speed up
            lifespan: 800,   // short lifespan
            on: false   // do not immediately start, will trigger in collision
        });
        this.physics.add.overlap(this.p1, this.bluePowerUpGroup, (obj1, obj2) => {

            this.powerUpVfxEffect.explode();  // trigger particle system
            
            obj2.destroy(); // remove power up
        })

        // setup camera
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.p1, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        //this.cameras.main.setDeadzone(50, 50);

        // define keyboard cursor input
        cursors = this.input.keyboard.createCursorKeys();

        // enable scene switcher / reload keys
        this.swap = this.input.keyboard.addKey('S');
        this.reload = this.input.keyboard.addKey('R');

        // update instruction text
        document.getElementById('description').innerHTML = '<h2>TiledPlatform.js</h2><br>←→: Move<br>↑: Jump<br>S: Next Scene<br>R: Restart Scene';

        // debug
        //this.scene.start("");
    }

    update() {
        // player movement
        if(cursors.left.isDown) {
            this.p1.body.setAccelerationX(-this.ACCELERATION);
            this.p1.play('walk', true);
            this.p1.setFlip(true, false);
        } else if(cursors.right.isDown) {
            this.p1.body.setAccelerationX(this.ACCELERATION);
            this.p1.play('walk', true);
            this.p1.resetFlip();
        } else {
            // set acceleration to 0 so DRAG will take over
            this.p1.play('idle');
            this.p1.body.setAccelerationX(0);
            this.p1.body.setDragX(this.DRAG);
        }
        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!this.p1.body.blocked.down) {
            this.p1.anims.play('jump');
        }
        if(this.p1.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            this.p1.body.setVelocityY(this.JUMP_VELOCITY);
        }

        // scene switching / restart
        if(Phaser.Input.Keyboard.JustDown(this.reload)) {
            this.scene.restart();
        }
        if(Phaser.Input.Keyboard.JustDown(this.swap)) {
            this.scene.start("parallaxLayersScene");
        }
    }
}