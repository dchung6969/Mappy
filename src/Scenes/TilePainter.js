class TilePainter extends Phaser.Scene {
    constructor() {
        super("tilepainterScene");

        // constants
        this.TILESINTILESET = 1056;    // number of tiles in selected tileset
        this.currentTile = 1;            // current tile in tile index
    }

    preload() {
        // load assets
        this.load.path = "./assets/";
        this.load.image("painter_tiles", "colored_packed.png");    // tile sheet
        this.load.tilemapTiledJSON("paintermap", "tilemap06.json");    // Tiled JSON file
    }

    create() {
        // add a tile map
        this.map = this.add.tilemap("paintermap");
        // add a tile set to the map
        this.tileset = this.map.addTilesetImage("colored_packed", "painter_tiles");
        // create a dynamic layer
        this.drawLayer = this.map.createDynamicLayer("drawLayer", this.tileset, 0, 0);

        // define keyboard cursor input
        cursors = this.input.keyboard.createCursorKeys();

        // create camera control configuration object to pass to Camera Controller
        let controlConfig = {
            camera: this.cameras.main,      // which camera?
            left: cursors.left,             // define keys...
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            acceleration: 0.06,             // physics values (keep these low)
            drag: 0.0005,
            maxSpeed: 0.5
        }
        // create smoothed key camera control
        this.camControl = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

        // set camera bounds
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        // setup mouse position
        this.worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);
        this.wpText = this.add.text(16, game.config.height - 48, '', { 
            fontSize: '8px',
            backgroundColor: '#000000' 
        }).setScrollFactor(0);

        // create graphic to draw tile marker when hovering over tile
        this.tileMarker = this.add.graphics();
        this.tileMarker.lineStyle(2, 0xFFFF00, 1);
        this.tileMarker.strokeRect(0, 0, this.map.tileWidth, this.map.tileHeight);

        // enable map tile increment/decrement
        this.tileDown = this.input.keyboard.addKey('J');
        this.tileUp = this.input.keyboard.addKey('L');
        this.tileDownSkip = this.input.keyboard.addKey('K');
        this.tileUpSkip = this.input.keyboard.addKey('I');

        // enable scene switcher / reload keys
        this.swap = this.input.keyboard.addKey('S');
        this.reload = this.input.keyboard.addKey('R');
    }

    update(time, delta) {
        // update pointer-related data
        this.worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);
        this.worldTile = this.drawLayer.getTileAtWorldXY(this.worldPoint.x, this.worldPoint.y);
        if(this.worldTile.index === null) { this.worldTile.index = -1 };    // bounds check to avoid errors
        this.wpText.text = `worldPoint x: ${this.worldPoint.x.toFixed(0)}, y: ${this.worldPoint.y.toFixed(0)}\ntile at point: ${this.worldTile.index}\ncurrentTile: ${this.currentTile}`;

        // place tile marker in world space, and snap it to the tile grid
        const pointerTileXY = this.drawLayer.worldToTileXY(this.worldPoint.x, this.worldPoint.y);
        const snappedWorldPoint = this.drawLayer.tileToWorldXY(pointerTileXY.x, pointerTileXY.y);
        this.tileMarker.setPosition(snappedWorldPoint.x, snappedWorldPoint.y);

        // draw tile
        if(this.input.activePointer.isDown) {
            this.drawLayer.putTileAtWorldXY(this.currentTile, this.worldPoint.x, this.worldPoint.y);
        }

        // tile index update (for drawing tiles)
        if(Phaser.Input.Keyboard.JustDown(this.tileDown)) {
            this.currentTile--;
            // wrap index value if below tile index 01
            if(this.currentTile < 1) {
                this.currentTile = this.TILESINTILESET;
            }
        }
        if(Phaser.Input.Keyboard.JustDown(this.tileUp)) {
            this.currentTile++;
            // wrap index value if above max tile index
            if(this.currentTile > this.TILESINTILESET) {
                this.currentTile = 1;
            }
        }
        if(Phaser.Input.Keyboard.JustDown(this.tileDownSkip)) {
            this.currentTile -= 50;
            // calculate proper wraparound tile index since we're skipping by 50
            if(this.currentTile < 1) {
                let dif = 1 - this.currentTile;
                this.currentTile = this.TILESINTILESET - dif;
            }
        }
        if(Phaser.Input.Keyboard.JustDown(this.tileUpSkip)) {
            this.currentTile += 50;
            // calculate proper wraparound tile index since we're skipping by 50
            if(this.currentTile > this.TILESINTILESET) {
                let dif = this.currentTile - this.TILESINTILESET;
                this.currentTile = 1 + dif;
            }
        }

        // update our camera controller (delta: Δ time in ms since last frame)
        this.camControl.update(delta);

        // scene switching / restart
        if(Phaser.Input.Keyboard.JustDown(this.reload)) {
            this.scene.restart();
        }
        if(Phaser.Input.Keyboard.JustDown(this.swap)) {
            this.scene.start("simpleanimationScene");
        }
    }
}