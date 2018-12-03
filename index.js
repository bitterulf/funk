'use strict';

const Hapi = require('hapi');
const Inert = require('inert');
const Vision = require('vision');
const Joi = require('joi');
const HapiSwagger = require('hapi-swagger');
const Pack = require('./package');
const FS = require('fs');
const Util = require('util');
const exec = Util.promisify(require('child_process').exec);
const git = require('simple-git')();
const Path = require('path');
const Primus = require('primus');
const shortid = require('shortid');
const md5 = require('md5');

const server=Hapi.server({
    host:'localhost',
    port:8080,
    routes: {
        files: {
            relativeTo: Path.join(__dirname, 'public')
        }
    }
});

const primus = new Primus(server.listener, {/* options */});

const runningGames = [];

primus.on('connection', function (spark) {
    if (spark.query.game) {
        const game = runningGames.find(function(game) {
            return game.id === spark.query.game;
        })

        if (game) {
            spark.write({
                type: 'gameState',
                game: game
            });

            spark.token = spark.query.token;
            spark.game = game.id;

            spark.write({
                type: 'token',
                token: spark.token
            });
        }
    }
    else {
        spark.write({ games: runningGames});
    }
});

const broadcastGames = function() {
    primus.forEach(function (spark, id, connections) {
        if (spark.query.game) return;
        spark.write({ games: runningGames});
    });
};

const helloHandler = async function(request, h) {

    setTimeout(function() {
        git.checkoutLatestTag((err, result) => {
            console.log(err, result);
            console.log('restart');
            process.exit();
        })
    }, 1000);

    return h.response('hello you');
}

server.route({
    method:'GET',
    path:'/hello',
    options: {
        handler: helloHandler,
        description: 'hello',
        notes: 'hello',
        tags: ['api']
    }
});

server.route({
    method:'POST',
    path:'/game',
    options: {
        handler: async function(request, h) {
            const game = {
                id: shortid.generate(),
                name: request.payload.name,
                state: {}
            };

            runningGames.push(game);
            broadcastGames();

            return h.response(game);
        },
        description: 'new game',
        notes: 'new game',
        tags: ['api'],
        validate: {
            payload: {
                name: Joi.string().required()
            }
        }
    }
})


function calcState(oldState, token, type, data) {
    console.log('stateCalc', oldState, token, type, data);

    const hashedToken = md5(token+'SomeStrangeText');
    if (type === 'setName') {
        if (!oldState.users) {
            oldState.users = [];
        }

        const existingUser = oldState.users.find(function(user) {
            return user.name === data.name || user.token === hashedToken;
        });

        if (existingUser) {
            return oldState;
        }

        oldState.users.push({
            token: hashedToken,
            name: data.name
        });

        return oldState;
    }

    return oldState;
};

function doAction (gameId, token, type, data) {
    const game = runningGames.find(function(game) {
        return game.id === gameId;
    })

    if (!game) {
        return;
    };

    game.state = calcState(game.state, token, type, data);

    primus.forEach(function (spark, id, connections) {
        if (spark.query.game != gameId) return;
        spark.write({
            type: 'gameState',
            game: game
        });
    });
}

server.route({
    method:'POST',
    path:'/action',
    options: {
        handler: async function(request, h) {
            primus.forEach(function (spark, id, connections) {
                if (spark.token === request.payload.token) {
                    console.log(spark.game, '!', request.payload);
                    doAction(spark.game, spark.token, request.payload.type, request.payload.data);
                }
            });

            return h.response('nice');
        },
        description: 'push action',
        notes: 'push action',
        tags: ['api'],
        validate: {
            payload: {
                token: Joi.string().required(),
                type: Joi.string().required(),
                data: Joi.object().required()
            }
        }
    }
})

const swaggerOptions = {
    info: {
        title: 'Test API Documentation',
        version: Pack.version,
    },
};

async function start() {
    await server.register([
        Inert,
        Vision,
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        }
    ]);

    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: '.',
                redirectToSlash: true,
                index: true,
            }
        }
    });

    try {
        await server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }

    console.log('Server running at:', server.info.uri);
};

start();
