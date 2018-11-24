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
                Device_Handler._add_to_websocket(device_id.id, adapter)
            }
        });
    }

    static stop_websocket(id){
        Websocket.stop_websocket(id)
    }

    static renew_all_websockets(adapter){
        Websocket.reconnect_all()
    }

    static update_current_zeptrion_states(adapter){
        adapter.getDevices(function(err, device_objects){
            if(err){
                adapter.log.error(err);
                return
            }
            device_objects.forEach(device_object => {
                adapter.getChannelsOf(device_object._id, function(err, channel_objs){
                    if(err){
                        adapter.log.error(err);
                        return
                    }
                    channel_objs.forEach(channel_obj => {
                        Channel_Handler.update_current_zeptrion_states(channel_obj, device_object._id, adapter)
                    });
                })
            });
        })
    }

    static renew_all_websockets(adapter){
        adapter.getDevices(function(err, device_objects){
            if(err){
                adapter.log.error(err);
                return
            }
            device_objects.forEach(device_object => {
                Websocket.stop_websocket(device_object._id)
                Device_Handler._add_to_websocket(device_object._id, adapter) 
            });
        })
    }

    static _add_to_websocket(device_id, adapter){
        adapter.getObject(device_id, function(err, device_obj){
            if(err){
                adapter.log.error(err);
                return
            }
            Websocket.add_websocket(device_obj._id, device_obj.native.addr, device_obj.native.port, function(device_id, data){
                Channel_Handler.websocket_changed(device_id, data, adapter)
            })
        })
    }
}