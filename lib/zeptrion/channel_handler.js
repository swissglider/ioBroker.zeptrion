'use strict';

const request = require('request')
const parseString = require('xml2js').parseString;
const Smart_Button_Handler = require(__dirname + '/smart_button_handler');
const Light_Switch_Handler = require(__dirname + '/light_switch_handler');
const Light_Dimmer_Handler = require(__dirname + '/light_dimmer_handler');
const Blind_Handler = require(__dirname + '/blind_handler');
const storage_place = ['a', 'c', 'e', 'g', 'i', 'k', 'm', 'o']

module.exports = class Channel_Handler{
    constructor() {}

    static set_channels(device_id, adapter){
        adapter.getObject(device_id, function(err, device_obj){
            if(err){
                adapter.log.error(err);
                return
            }
            if(!device_obj || !('native' in device_obj)){
                return
            }
            if('smart_panel' in device_obj.native && device_obj.native.smart_panel === true){
                Channel_Handler._proceed_as_smart_panel(device_id, device_obj, adapter)
            }
            Channel_Handler._proceed_as_panel(device_id, device_obj, adapter)
        })
    }

    static _proceed_as_smart_panel(device_id, device_obj, adapter){
        // check if smart button
        let transfer = {
            device_id: device_id,
            device_obj: device_obj,
            adapter: adapter
        }
        device_obj.native.smartfront_info.btfu.split(",").map(function (val, index) {
            if(val === 1000 || val === '1000'){
                let channel = storage_place[index]
                let transfer = Object.assign({}, this);
                transfer.channel = channel
                var url = 'http://' + this.device_obj.native.addr + ":" + this.device_obj.native.port + '/zapi/smartbt/prgs/' + channel
                request(url, function(err, res, body) {
                    let info = {}
                    if(err){
                        adapter.log.error(err);
                        return
                    }
                    if (res.statusCode === 200){
                        let new_body = {}
                        try {
                            new_body = JSON.parse(body)
                        } catch (error) {
                            adapter.log.error('Error while reading SmartButton info: ' + body)
                            adapter.log.error(error)
                            return
                        }
                        
                        if('type' in new_body && new_body.type === 'zeptrion_Air'){
                            info = new_body
                        }else{
                            info = Smart_Button_Handler.set_new_configuration(this.device_obj, this.channel, null, this.adapter)
                        }
                    }else{
                        info = Smart_Button_Handler.set_new_configuration(this.device_obj, this.channel, null, this.adapter)
                    }        
                    Channel_Handler._create_channel(this.device_id, this.device_obj, this.adapter, info)
                }.bind(transfer))
            }
        }.bind(transfer))
    }

    static _proceed_as_panel(device_id, device_obj, adapter){
        var url = 'http://' + device_obj.native.addr + ":" + device_obj.native.port + '/zrap/chdes'
        request(url, function(err, res, body) {
            if(err){
                adapter.log.error(err);
                return
            }
            parseString(body, function (err, result) {
                if(err){
                    adapter.log.error(err);
                    return
                }
                if(result && 'chdes' in result){
                    Object.keys(result.chdes).map(function(key, index) {
                        let ch = result.chdes[key][0]
                        let info = {
                            group: ch.group[0],
                            friendly_name: ch.name[0],
                            id: key,
                            cat: ch.cat[0]
                        }
                        Channel_Handler._create_channel(device_id, device_obj, adapter, info)
                    }.bind(this));
                }
            }.bind(this));
        }.bind(device_obj))
    }

    static _create_channel(device_id, device_obj, adapter, info){
        let device_type_class = Channel_Handler._get_device_type_class(info.cat)
        if(device_type_class === null){
            return
        }
        let desc = device_type_class.get_desc()
        let role = device_type_class.get_role()
        
        let common = {
            role: role,
            desc:  desc,
            mobile: {
                admin: {
                    visible: true
                }
            },
            name: info.friendly_name
        }
        let native = {
            addr: device_obj.native.addr,
            port: device_obj.native.port,
            id: info.id,
            cat: info.cat,
            device: device_obj.native.name,
            room: info.group
        }
        adapter.createChannel(device_obj.common.name, info.id, common, native, function(err, channel_id){
            if(err){
                adapter.log.error(err);
                return
            }
            //console.log('should: ' + device_obj.common.name + '.' + info.id + ' into group: ' + info.group)
            if(info.group && info.group !='' && info.group != ' ' && info.group != '.'){
                var wait_to_enum = ()=>{
                    //console.log(device_obj.common.name + '.' + info.id + ' into group: ' + info.group)
                    adapter.addChannelToEnum('rooms', info.group, device_obj.common.name, info.id)
                }
                setTimeout(wait_to_enum, 250)
            }
            let common_name = {
                role: 'meta',
                name: 'Name',
                def:   info.friendly_name,
                type:  "string",
                read:  true,
                write: true,
            }
            adapter.createState(device_obj.native.name, info.id, 'state-name', common_name, native)
            Channel_Handler.create_state(channel_id.id, adapter)
        })
    }

    static _get_device_type_class(cat){
        if(cat === '1'){
            return Light_Switch_Handler
        }else if(cat === '3'){
            return Light_Dimmer_Handler
            //return Light_Switch_Handler
        }else if(cat === '5'){
            return Blind_Handler
        }else if(cat === '6'){
            return Blind_Handler
        }else if(cat === '17'){
            return Smart_Button_Handler
        }else{
            return null
        }
    }

    static create_state(channel_id, adapter){
        adapter.getObject(channel_id, function(err, channel_obj){
            let device_type_class = Channel_Handler._get_device_type_class(channel_obj.native.cat)
            if(device_type_class === null){
                return
            }
            device_type_class.create_state(channel_obj, channel_id, adapter)
        })
    }

    static state_change_ack_false(state_id, new_state, adapter){
        adapter.getObject(state_id, function(err, obj){
            if(err){
                adapter.log.error(err);
                return
            }
            if(obj && 'native' in obj && 'cat' in obj.native){
                let device_type_class = Channel_Handler._get_device_type_class(obj.native.cat)
                if(device_type_class === null){
                    return
                }
                device_type_class.state_change_ack_false(state_id, new_state, obj, adapter)
            }
        })  
    }

    static websocket_changed(device_id, data, adapter){
        adapter.getChannelsOf(device_id, function(err, objs){
            if(err){
                adapter.log.error(err);
                return
            }
            let id, value, obj
            data = JSON.parse(data);
            if(data && 'eid1' in data){
                id = 'ch' + data.eid1.ch
                value = data.eid1.val
            }else if(data && 'eid2' in data){
                value = null
                data.eid2.bta.split('.').map(function(value, index){
                    if(value === 'P'){
                        id = storage_place[index]
                    }
                })
            }else{
                return
            }
            //console.log('WebSocket changed data (id): ' + id + ' (value): ' + value);
            objs.forEach(function(temp_obj) {
                if(temp_obj && 'native' in temp_obj && 'id' in temp_obj.native){
                    if(temp_obj.native.id.endsWith(id)){
                        obj = temp_obj
                    }
                }
            });
            if(obj){
                let device_type_class = Channel_Handler._get_device_type_class(obj.native.cat)
                if(device_type_class === null){
                    return
                }
                device_type_class.websocket_changed(obj, value, adapter)
            }
        })
    }

    static handle_rooms(room_id, room_obj, adapter){
        adapter.getDevices(function(err, device_objs){
            if(err){
                adapter.log.error(err);
                return
            }
            let channels = []
            device_objs.forEach(function(device_obj){
                if(device_obj._id.startsWith('zeptrion.'))
                adapter.getChannelsOf(device_obj._id, function(err, channel_objs){   
                    if(err){
                        adapter.log.error(err);
                        return
                    }
                    channel_objs.forEach(function(channel_obj){
                        console.log(channel_obj._id)
                        let channel_name = ''
                        if(typeof room_obj.common.name === 'object'){
                            if('de' in room_obj.common.name){
                                channel_name = room_obj.common.name.de
                            }
                            else if('en' in room_obj.common.name){
                                channel_name = room_obj.common.name.en
                            }
                            else{
                                adapter.log.error('Error while setting the new room: Wrong Object: ' + JSON.stringify(room_obj.common.name));
                            }
                        }
                        else if(typeof room_obj.common.name === 'string'){
                            channel_name = room_obj.common.name
                        }
                        else{
                            adapter.log.error('Error while setting the new room: Wrong type: ' + typeof room_obj.common.name);
                        }
                        let is_zept_room = (channel_obj.native.room === channel_name)
                        let is_channel_in_room = (room_obj.common.members.includes(channel_obj._id))
                        if((is_zept_room && is_channel_in_room) || (!is_zept_room && !is_channel_in_room)){
                            return
                        }
                        let device_type_class = Channel_Handler._get_device_type_class(channel_obj.native.cat)
                        if(device_type_class === null){
                            return
                        }
                        if(is_zept_room && !is_channel_in_room){
                            // removed from room
                            console.log('deleted :' + channel_obj._id + ' from ' + channel_name)
                            channel_obj.native.room = ''
                            adapter.setObject(channel_obj._id, channel_obj)
                            device_type_class.change_room_on_device(channel_obj, '', adapter)
                        }
                        if(!is_zept_room && is_channel_in_room){
                            // add to room
                            channel_obj.native.room = channel_name
                            console.log('added :' + channel_obj._id + ' from ' + channel_name)
                            adapter.setObject(channel_obj._id, channel_obj)
                            device_type_class.change_room_on_device(channel_obj, channel_obj.native.room, adapter)
                        }
                    })
                })
            })
            
        })
    }

    static change_channel_name(state_id, state, adapter){
        let channel_id = Channel_Handler._getParentID(state_id)
        adapter.getObject(channel_id, function(err, channel_obj){
            if(err){
                adapter.log.error(err);
                return
            }
            if(channel_obj != state.val){
                channel_obj.common.name = state.val
                adapter.setObject(channel_obj._id, channel_obj)
            }
            if(channel_obj && 'native' in channel_obj && 'cat' in channel_obj.native){
                let device_type_class = Channel_Handler._get_device_type_class(channel_obj.native.cat)
                if(device_type_class === null){
                    return
                }
                device_type_class.change_channel_name(channel_obj, adapter)
            }
        })
    }

    static _getParentID(child_id){
        let parents = child_id.split('.')
        let parent_id = ''
        parents.forEach(function(parent, index){
            if(index+1 < parents.length)
                parent_id += parent
            if(index+2 < parents.length)
                parent_id += '.'
        })
        return parent_id
    }

    static update_current_zeptrion_states(channel_obj, device_id, adapter){
        let device_type_class = Channel_Handler._get_device_type_class(channel_obj.native.cat)
        if(device_type_class === null){
            return
        }
        device_type_class.update_current_zeptrion_states(channel_obj, adapter)
    }
}