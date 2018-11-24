'use strict';

const request = require('request')
const Channel_Handler = require(__dirname + '/channel_handler');
const Websocket = require(__dirname + '/websocket');
const storage_place = ['a', 'c', 'e', 'g', 'i', 'k', 'm', 'o']

module.exports = class Device_Handler{
    constructor() {}

    static set_device(adapter, device_info){
        let addr = device_info._addr
        let port = device_info._port
        let name = device_info._name

        let transfer = {
            device_info: device_info,
            adapter: adapter
        }

        let url = "http://" + addr + ":" + port + "/zapi/smartfront/id/"
        request(url, function(err, res, body) {
            if(err){
                this.adapter.log.error(err);
            }
            this.device_info.smart_panel = false
            // check if smart panel
            if(res.statusCode === 200 ){
                body = JSON.parse(body)
                this.device_info.smartfront_info = body
                this.device_info.smart_panel = true
            }
            Device_Handler._create_Device(this.device_info, this.adapter)
        }.bind(transfer))
    }

    static _create_Device(device_info, adapter){
        let name = device_info._name.split('.')[0]
        let common = {
            name: name
        }
        let native = {
            name: name,
            addr: device_info._addr,
            port: device_info._port,
            smart_panel: device_info.smart_panel,
            device: name
        }
        if(device_info.smart_panel){
            native.smartfront_info = device_info.smartfront_info
        }
        adapter.setObjectNotExists(name, {
            type: 'device',
            common: common,
            native: native
        }, function(err, device_id){
            if(err){
                adapter.log.error(err);
                return
            } else if(device_id){
                Channel_Handler.set_channels(device_id.id, adapter)
                Websocket.add_websocket(device_id.id, device_info._addr, device_info._port, function(device_id, data){
                    Channel_Handler.websocket_changed(device_id, data, adapter)
                })
            }
        });
    }
}