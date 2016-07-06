#!/usr/bin/env node 
"use strict";
var program = require('commander');
var startServer = require('../lib/server.js');
var info = require('../package.json');
var Config = require('../lib/components/Config');
var Builder = require('../lib/components/Builder');
var Fs = require('fs');
var Path = require('path');
var getIP = require('../lib/util/getIP');
var launchDevTool = require('../lib/util/launchDevTool');
var del=require('del');
program
    .option('-V, --verbose', 'display logs of debugger server')
    .option('-v, --version', 'display version')
    .option('-p, --port [port]', 'set debugger server port', '8088')
    .option('-e, --entry [entry]','set the entry bundlejs path when you specific the bundle server root path')
    .option('-m, --mode [mode]','set build mode [transformer|loader]','transformer')
program['arguments']('[we_file]')
    .action(function (we_file) {
        program.we_file = we_file;
    });
program.parse(process.argv);

if (program.version == undefined) {
    //fix tj's commander bug
    console.log(info.version);
    process.exit(0);
}
var supportMode=['loader','transformer'];
Config.verbose = program.verbose;
Config.port = program.port;
if(supportMode.indexOf(program.mode)==-1){
    console.log('unsupported build mode:',program.mode);
    process.exit(0);
}
else {
    Config.buildMode = program.mode;
    console.log(Config.buildMode)
}
del.sync([Path.join(__dirname,'../frontend/',Config.bundleDir,'/*')]);
if (program.we_file) {
    resolvePath()
}
else {
    startServerAndLaunchDevtool()
}

function resolvePath() {
    var dir = Path.resolve(program.we_file);
    var ext = Path.extname(dir);
    if (!Fs.existsSync(dir)) {
        console.error(dir + ': No such file or directory');
        return process.exit(0);
    }
    if (ext == '.we') {
        console.log('Building...');
        var t = new Date().getTime();
        Builder[Config.buildMode](dir).then(function () {
            console.log('Build completed! ' + (new Date().getTime() - t) + 'ms');
            startServerAndLaunchDevtool(program.we_file);
        })
    }
    else if (!ext) {
        if (Fs.statSync(dir).isDirectory()) {
            Config.root = dir;
            startServerAndLaunchDevtool(program.entry)
        }
        else {
            console.error(program.we_file + ' is not a directory!');
            process.exit(0);
        }
    }
    else {
        console.error('Error:unsupported file type: ', Path.extname(program.we_file));
        return process.exit(0);
    }
}

function startServerAndLaunchDevtool(entry) {
    var port = program.port;

    getIP(function (err, ips) {
        if (err) {
            console.error(err);
            return process.exit(0);
        }
        console.info('start debugger server at http://' + ips[0] + ':' + port);
        if (entry) {
            Config.entryBundleUrl = 'http://' + ips[0] + ':' + port +  Path.join('/'+Config.bundleDir,Path.basename(entry).replace(/\.we$/,'.js'));
            console.log('\nYou can visit we file(s) use ' + Config.entryBundleUrl);
            console.log('Also you can use Playground App to scan the qrcode on device list page.');
        }

        if (Config.root) {
            console.log('\nDirectory[' + program.we_file + '] has been mapped to http://' + ips[0] + ':' + port + '/'+Config.bundleDir+'/');
        }

        console.info('\nThe websocket address for native is ws://' + ips[0] + ':' + port + '/debugProxy/native');

        startServer(port);
        launchDevTool(ips[0], port);
    });
}