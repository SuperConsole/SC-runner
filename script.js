"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var game = void 0;

var config = {
    platformSpeedRange: [300, 300],
    spawnRange: [80, 300],
    platformSizeRange: [90, 300],
    platformHeightRange: [-5, 5],
    platformHeighScale: 20,
    platformVerticalLimit: [0.4, 0.8],
    playerGravity: 980,
    jumpForce: 350,
    playerStartPosition: 200,
    jumps: 5,
    coinPercent: 30
};

window.onload = function () {
    var g_conf = {
        type: Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: [preloadGame, playGame],
        backgroundColor: 0x000000,
        physics: {
            default: "arcade"
        }
    };
    game = new Phaser.Game(g_conf);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
};

var preloadGame = function (_Phaser$Scene) {
    _inherits(preloadGame, _Phaser$Scene);

    function preloadGame() {
        _classCallCheck(this, preloadGame);

        return _possibleConstructorReturn(this, (preloadGame.__proto__ || Object.getPrototypeOf(preloadGame)).call(this, "PreloadGame"));
    }

    _createClass(preloadGame, [{
        key: "preload",
        value: function preload() {
            this.load.image("platform", "platform.png");

            // player is a sprite sheet made by 24x48 pixels
            this.load.spritesheet("player", "player.png", {
                frameWidth: 24,
                frameHeight: 48
            });

            // the coin is a sprite sheet made by 20x20 pixels
            this.load.spritesheet("coin", "coin.png", {
                frameWidth: 20,
                frameHeight: 20
            });
        }
    }, {
        key: "create",
        value: function create() {
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
    }]);

    return preloadGame;
}(Phaser.Scene);

var playGame = function (_Phaser$Scene2) {
    _inherits(playGame, _Phaser$Scene2);

    function playGame() {
        _classCallCheck(this, playGame);

        return _possibleConstructorReturn(this, (playGame.__proto__ || Object.getPrototypeOf(playGame)).call(this, "PlayGame"));
    }

    _createClass(playGame, [{
        key: "create",
        value: function create() {

            // keeping track of added platforms
            this.addedPlatforms = 0;

            // group with all active platforms.
            this.platformGroup = this.add.group({

                // once a platform is removed, it's added to the pool
                removeCallback: function removeCallback(platform) {
                    platform.scene.platformPool.add(platform);
                }
            });

            // platform pool
            this.platformPool = this.add.group({

                // once a platform is removed from the pool, it's added to the active platforms group
                removeCallback: function removeCallback(platform) {
                    platform.scene.platformGroup.add(platform);
                }
            });

            // group with all active coins.
            this.coinGroup = this.add.group({

                // once a coin is removed, it's added to the pool
                removeCallback: function removeCallback(coin) {
                    coin.scene.coinPool.add(coin);
                }
            });

            // coin pool
            this.coinPool = this.add.group({

                // once a coin is removed from the pool, it's added to the active coins group
                removeCallback: function removeCallback(coin) {
                    coin.scene.coinGroup.add(coin);
                }
            });

            // number of consecutive jumps made by the player so far
            this.playerJumps = 0;

            // adding a platform to the game, the arguments are platform width, x position and y position
            this.addPlatform(game.config.width, game.config.width / 2, game.config.height * config.platformVerticalLimit[1]);

            // adding the player;
            this.player = this.physics.add.sprite(config.playerStartPosition, game.config.height * 0.7, "player");
            this.player.setGravityY(config.playerGravity);

            // setting collisions between the player and the platform group
            this.physics.add.collider(this.player, this.platformGroup, function () {

                // play "run" animation if the player is on a platform
                if (!this.player.anims.isPlaying) {
                    this.player.anims.play("run");
                }
            }, null, this);

            // setting collisions between the player and the coin group
            this.physics.add.overlap(this.player, this.coinGroup, function (player, coin) {
                this.tweens.add({
                    targets: coin,
                    y: coin.y - 100,
                    alpha: 0,
                    duration: 800,
                    ease: "Cubic.easeOut",
                    callbackScope: this,
                    onComplete: function onComplete() {
                        this.coinGroup.killAndHide(coin);
                        this.coinGroup.remove(coin);
                    }
                });
            }, null, this);

            // checking for input
            this.input.on("pointerdown", this.jump, this);
        }

        // the core of the script: platform are added from the pool or created on the fly

    }, {
        key: "addPlatform",
        value: function addPlatform(platformWidth, posX, posY) {
            this.addedPlatforms++;
            var platform = void 0;
            if (this.platformPool.getLength()) {
                platform = this.platformPool.getFirst();
                platform.x = posX;
                platform.y = posY;
                platform.active = true;
                platform.visible = true;
                this.platformPool.remove(platform);
                platform.displayWidth = platformWidth;
                platform.tileScaleX = 1 / platform.scaleX;
            } else {
                platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform");
                this.physics.add.existing(platform);
                platform.body.setImmovable(true);
                platform.body.setVelocityX(Phaser.Math.Between(config.platformSpeedRange[0], config.platformSpeedRange[1]) * -1);
                this.platformGroup.add(platform);
            }
            this.nextPlatformDistance = Phaser.Math.Between(config.spawnRange[0], config.spawnRange[1]);

            // is there a coin over the platform?
            if (this.addedPlatforms > 1) {
                if (Phaser.Math.Between(1, 100) <= config.coinPercent) {
                    if (this.coinPool.getLength()) {
                        var coin = this.coinPool.getFirst();
                        coin.x = posX;
                        coin.y = posY - 96;
                        coin.alpha = 1;
                        coin.active = true;
                        coin.visible = true;
                        this.coinPool.remove(coin);
                    } else {
                        var _coin = this.physics.add.sprite(posX, posY - 96, "coin");
                        _coin.setImmovable(true);
                        _coin.setVelocityX(platform.body.velocity.x);
                        _coin.anims.play("rotate");
                        this.coinGroup.add(_coin);
                    }
                }
            }
        }

        // the player jumps when on the ground, or once in the air as long as there are jumps left and the first jump was on the ground

    }, {
        key: "jump",
        value: function jump() {
            if (this.player.body.touching.down || this.playerJumps > 0 && this.playerJumps < config.jumps) {
                if (this.player.body.touching.down) {
                    this.playerJumps = 0;
                }
                this.player.setVelocityY(config.jumpForce * -1);
                this.playerJumps++;

                // stops animation
                this.player.anims.stop();
            }
        }
    }, {
        key: "update",
        value: function update() {

            // game over
            if (this.player.y > game.config.height) {
                this.scene.start("PlayGame");
            }
            this.player.x = config.playerStartPosition;

            // recycling platforms
            var minDistance = game.config.width;
            var rightmostPlatformHeight = 0;
            this.platformGroup.getChildren().forEach(function (platform) {
                var platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
                if (platformDistance < minDistance) {
                    minDistance = platformDistance;
                    rightmostPlatformHeight = platform.y;
                }
                if (platform.x < -platform.displayWidth / 2) {
                    this.platformGroup.killAndHide(platform);
                    this.platformGroup.remove(platform);
                }
            }, this);

            // recycling coins
            this.coinGroup.getChildren().forEach(function (coin) {
                if (coin.x < -coin.displayWidth / 2) {
                    this.coinGroup.killAndHide(coin);
                    this.coinGroup.remove(coin);
                }
            }, this);

            // adding new platforms
            if (minDistance > this.nextPlatformDistance) {
                var nextPlatformWidth = Phaser.Math.Between(config.platformSizeRange[0], config.platformSizeRange[1]);
                var platformRandomHeight = config.platformHeighScale * Phaser.Math.Between(config.platformHeightRange[0], config.platformHeightRange[1]);
                var nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
                var minPlatformHeight = game.config.height * config.platformVerticalLimit[0];
                var maxPlatformHeight = game.config.height * config.platformVerticalLimit[1];
                var nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
                this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
            }
        }
    }]);

    return playGame;
}(Phaser.Scene);

;

function resize() {
    var canvas = document.querySelector("canvas");
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    var windowRatio = windowWidth / windowHeight;
    var gameRatio = game.config.width / game.config.height;
    if (windowRatio < gameRatio) {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = windowWidth / gameRatio + "px";
    } else {
        canvas.style.width = windowHeight * gameRatio + "px";
        canvas.style.height = windowHeight + "px";
    }
}
