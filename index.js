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

const server=Hapi.server({
    host:'localhost',
    port:8080
});

const helloHandler = async function(request, h) {

    setTimeout(function() {
        git.checkoutLatestTag((err, result) => {
            console.log(err, result);
            console.log('restart');
            process.exit(1);
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
