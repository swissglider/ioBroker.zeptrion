'use strict';

const webso = require('ws');

var websockets = {}
/*
{
    id = {
        addr:'192.168.86.11',
        port:80,
        callback: callback
        ws: ws
    }
}
*/

module.exports = class Websocket{
    constructor() {}

    static add_websocket(channel_id, channel_addr, channel_port, callback){
        if(channel_id in websockets){
            Websocket.stop_websocket(channel_id)
        }
        websockets[channel_id] = {
            addr: channel_addr,
            port: channel_port,
            callback: callback
        }
        let ws = new webso("ws://" + channel_addr + ':' + channel_port);
        websockets[channel_id].ws = ws
        ws.on('open', function open(e) {
            // console.log('open websocket: ' + this.url)
        });
        ws.on('close', function close() {
            // console.log('disconnected: ' + this.url);
        });
        ws.on('message', function incoming(data) {
            // console.log('change: ' + this.url);
            const ip = this.url.substring(5)
            Object.keys(websockets).map(function(key, index) {
                if(websockets[key].addr + ':' + websockets[key].port === ip){
                    callback(key, data)
                }
            });
        });
    }

    static reconnect_websocket(channel_id){
        if(!(channel_id in websockets)){
            adapter.log.error(channel_id + ' not yet added to websocket');
        }
        channel_addr = websockets[channel_id].addr
        channel_port = websockets[channel_id].port
        Websocket.stop_websocket(channel_id)
        Websocket.add_websocket(channel_id, channel_addr, channel_port)
    }

    static stop_websocket(channel_id){
        if(channel_id in websockets){
            websockets[channel_id].ws.close()
            websockets[channel_id].ws.terminate()
            delete websockets[channel_id]
        }
    }

    static reconnect_all(){
        Object.keys(websockets).map(function(key, index) {
            Websocket.reconnect_websocket(key)
        });
    }
}

function _startWS(_ip){
    ws = new webso("ws://" + _ip);
    ws.on('open', function open(e) {
        // console.log('open websocket: ' + this.url)
    });
    
    ws.on('close', function close() {
        // console.log('disconnected: ' + this.url);
        ip = this.url.substring(5)
        if(websockets && ip in websockets   )
            delete websockets[ip]
    });
    
    ws.on('message', function incoming(data) {
        // console.log('change: ' + this.url);
        const ip = this.url.substring(5)
        let device = _getDevice(data, ip)
        if(device){
            _setNewState(data, device)
        }
    });
    return ws
}


function _setNewState(data, device){
    let result = JSON.parse(data)
    let cat = parseInt(getObject(device).native.cat)
    value = parseInt(result.eid1.val)
    if(this.obj.native.cat === '-1'){ // unused
        return
    }else if(cat === 1){ // light on/of
        if(value === 0){
            setState(device, false, false);
        }else{
            setState(device, true, false);
        }
    }else if(cat === 3){ // light dimmable
        setState(device, value, false)
    }else if(cat === 5){ // blind
        setState(device, value, false)
    }else if(cat === 6){ // markise
        setState(device, value, false)
    }else if(cat === 17){ // smart button
        setState(device, true, false)
    }else{ // unknown type
        setState(device, value, false)
    }
}

function _getDevice(data, ip){
    let result = JSON.parse(data)
    let device = null
    if("eid1" in result && "ch" in result.eid1){
        channel = 'ch' + result.eid1.ch
        device = __getDevice(ip, channel)
    }
    else if('eid2' in result && 'bta' in result.eid2){
        channel = __getStoragePlace(result.eid2.bta)
        if(channel === -1){
            return
        }
        device = __getDevice(ip, channel)
    }
    if(!device){
        return
    }
    return device
}

function __getDevice(ip, channel){
    let _id = null
    $('[state.id=javascript.0.zeptrion.device.*]').each(function(id, i) {
        native = getObject(id).native
        if(native.ip === ip && native.id == channel){
            _id = id
        }
    });
    return _id
}

function __getStoragePlace(bta){
    const storage_place = ['a', 'c', 'e', 'g', 'i', 'k', 'm', 'o']
    
    let storage = -1
    bta.split('.').map(function(value, index){
        if(value === 'P'){
            storage = storage_place[index]
        }
    })
    return(storage)
}
