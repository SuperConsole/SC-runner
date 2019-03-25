let game;

let config = {
    platformSpeedRange: [500, 500],
    spawnRange: [80, 300],
    platformSizeRange: [90, 300],
    platformHeightRange: [-5, 5],
    platformHeighScale: 20,
    platformVerticalLimit: [0.4, 0.8],
    playerGravity: 980,
    jumpForce: 340,
    playerStartPosition: 200,
    jumps: 3,
    coinPercent: 30
}

window.onload = function() {
    let g_conf = {
        type: Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: [preloadGame, playGame],
        backgroundColor: 0x000000,
        physics: {
            default: "arcade"
        }
    }
    game = new Phaser.Game(g_conf);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
}

class preloadGame extends Phaser.Scene{
    constructor(){
        super("PreloadGame");
    }
    preload(){
        this.load.image("platform", "platform.png");
        this.load.spritesheet("player", "player.png", {
            frameWidth: 24,
            frameHeight: 48
        });
        this.load.spritesheet("coin", "coin.png", {
            frameWidth: 20,
            frameHeight: 20
        });
    }
    create(){
        this.anims.create({
            key: "run",
            frames: this.anims.generateFrameNumbers("player", {
                start: 0,
                end: 1
            }),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: "rotate",
            frames: this.anims.generateFrameNumbers("coin", {
                start: 0,
                end: 5
            }),
            frameRate: 15,
            yoyo: true,
            repeat: -1
        });

        this.scene.start("PlayGame");
    }
}

class playGame extends Phaser.Scene{

    constructor(){
        super("PlayGame");
    }

    create(){
        this.addedPlatforms = 0;
        this.platformGroup = this.add.group({
            removeCallback: function(platform){
                platform.scene.platformPool.add(platform)
            }
        });
        this.platformPool = this.add.group({
            removeCallback: function(platform){
                platform.scene.platformGroup.add(platform)
            }
        });
        this.coinGroup = this.add.group({
            removeCallback: function(coin){
                coin.scene.coinPool.add(coin)
            }
        });
        this.coinPool = this.add.group({
            removeCallback: function(coin){
                coin.scene.coinGroup.add(coin)
            }
        });
        this.playerJumps = 0;
        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * config.platformVerticalLimit[1]);
        this.player = this.physics.add.sprite(config.playerStartPosition, game.config.height * 0.7, "player");
        this.player.setGravityY(config.playerGravity);
        this.physics.add.collider(this.player, this.platformGroup, function(){
            if(!this.player.anims.isPlaying){
                this.player.anims.play("run");
            }
        }, null, this);
        this.physics.add.overlap(this.player, this.coinGroup, function(player, coin){
            this.tweens.add({
                targets: coin,
                y: coin.y - 100,
                alpha: 0,
                duration: 800,
                ease: "Cubic.easeOut",
                callbackScope: this,
                onComplete: function(){
                    this.coinGroup.killAndHide(coin);
                    this.coinGroup.remove(coin);
                }
            });
        }, null, this);
        this.input.on("pointerdown", this.jump, this);
    }

    addPlatform(platformWidth, posX, posY){
        this.addedPlatforms ++;
        let platform;
        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.y = posY;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1 / platform.scaleX;
        }
        else{
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform");
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(config.platformSpeedRange[0], config.platformSpeedRange[1]) * -1);
            this.platformGroup.add(platform);
        }
        this.nextPlatformDistance = Phaser.Math.Between(config.spawnRange[0], config.spawnRange[1]);
        if(this.addedPlatforms > 1){
            if(Phaser.Math.Between(1, 100) <= config.coinPercent){
                if(this.coinPool.getLength()){
                    let coin = this.coinPool.getFirst();
                    coin.x = posX;
                    coin.y = posY - 96;
                    coin.alpha = 1;
                    coin.active = true;
                    coin.visible = true;
                    this.coinPool.remove(coin);
                }
                else{
                    let coin = this.physics.add.sprite(posX, posY - 96, "coin");
                    coin.setImmovable(true);
                    coin.setVelocityX(platform.body.velocity.x);
                    coin.anims.play("rotate");
                    this.coinGroup.add(coin);
                }
            }
        }
    }

    jump(){
        if(this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < config.jumps)){
            if(this.player.body.touching.down){
                this.playerJumps = 0;
            }
            this.player.setVelocityY(config.jumpForce * -1);
            this.playerJumps ++;
            this.player.anims.stop();
        }
    }

    update(){
        if(this.player.y > game.config.height){
            alert("Game OVER!");
            this.scene.start("PlayGame");
        }
        this.player.x = config.playerStartPosition;

        // recycling platforms
        let minDistance = game.config.width;
        let rightmostPlatformHeight = 0;
        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            if(platformDistance < minDistance){
                minDistance = platformDistance;
                rightmostPlatformHeight = platform.y;
            }
            if(platform.x < - platform.displayWidth / 2){
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // recycling coins
        this.coinGroup.getChildren().forEach(function(coin){
            if(coin.x < - coin.displayWidth / 2){
                this.coinGroup.killAndHide(coin);
                this.coinGroup.remove(coin);
            }
        }, this);

        // adding new platforms
        if(minDistance > this.nextPlatformDistance){
            let nextPlatformWidth = Phaser.Math.Between(config.platformSizeRange[0], config.platformSizeRange[1]);
            let platformRandomHeight = config.platformHeighScale * Phaser.Math.Between(config.platformHeightRange[0], config.platformHeightRange[1]);
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
            let minPlatformHeight = game.config.height * config.platformVerticalLimit[0];
            let maxPlatformHeight = game.config.height * config.platformVerticalLimit[1];
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
        }
    }
};

function resize(){
    let canvas = document.querySelector("canvas");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = game.config.width / game.config.height;
    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else{
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}
