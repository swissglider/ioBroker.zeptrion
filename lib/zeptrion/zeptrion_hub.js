'use strict';
const EventEmitter = require('events');

module.exports = class Zeptrion_Hub extends EventEmitter {
    constructor() {
        super()
    }
    
    browse(timeout = 10) {
        //console.log("start browsing")
        try {
            var Mdns = require ('mdns-discovery');
        } catch (e) {
            this.emit('error', e)
            return
        }
    
        this.close = function() {
            mdns.close();
            this.emit('closed');
        };
    
        var mdns = new Mdns ({
            timeout: timeout,
            name: [ '_zapp._tcp.local' ],
            find: '*',
            broadcast: false
        });
        mdns.noQuestions = true;

        mdns.run (function (result) {
            this.emit('finished', result);
        }.bind(this));

        mdns.on('entry', function(res) {
            if('SRV' in res && 'data' in res.SRV && 'port' in res.SRV.data){
                var device = {
                    _addr: res.ip,
                    _port: res.SRV.data.port,
                    _name: res.SRV.name
                }
                this.emit('event', device);
            }
        }.bind(this));
    }
}