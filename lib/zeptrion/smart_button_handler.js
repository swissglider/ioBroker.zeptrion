'use strict';

const request = require('request')

module.exports = class Smart_Button_Handler{
    constructor() {}

    static get_desc(){return 'Zeptrion Smart Button'}
    static get_role(){return 'button'}

    static set_new_configuration(device_obj, channel, friendly_name, adapter){
        let room = ''
        if('room' in device_obj.native){
            room = device_obj.native.room
        }
        if(friendly_name == null){
            friendly_name = device_obj.native.device + '_' + channel
        }
        let info = {
            "type": "zeptrion_Air",
            "group": room,
            "friendly_name": friendly_name,
            "id": channel,
            "cat": '17'
        }
        let url = 'http://' + device_obj.native.addr + ':' + device_obj.native.port + '/zapi/smartbt/prgs/' + channel
        request.post({url:url, json: info}, function(err, res, body){
            if(err){
                adapter.log.error(err);
            }
        })
        return info
    }

    static create_state(channel_obj, channel_id, adapter){
        let trans = {
            obj: channel_obj,
            channel_id: channel_id,
            adapter: adapter
        }
        let common = {
            name: channel_obj.common.name,
            def:   true,
            type:  "boolean",
            read:  true,
            write: true,
            role: 'button',
            desc:  "Zeptrion Smart Button",
            mobile: {
                admin: {
                    visible: true,
                    name: 'Switch',
                    type: 'Socket'
                }
            }
        }
        adapter.createState(channel_obj.native.device, channel_obj.native.id, 'state-button', common, channel_obj.native, function(err, state_id){
            if(err){
                adapter.log.error(err);
                return
            }
            Smart_Button_Handler.update_current_zeptrion_states(this.obj, this.adapter)
            var wait_to_enum = ()=>{
                adapter.addStateToEnum('functions', 'Smart', channel_obj.native.device, channel_obj.native.id, 'state-button')
            }
            setTimeout(wait_to_enum, 300)
        }.bind(trans))
    }

    static update_current_zeptrion_states(channel_obj, adapter){
        let state_name = channel_obj._id + '.state-button'
        adapter.setState(state_name, {val: true, ack: true});
    }

    static state_change_ack_false(state_id, new_state, obj, adapter){
        return
    }

    static websocket_changed(channel_obj, value, adapter){
        Smart_Button_Handler.update_current_zeptrion_states(channel_obj, adapter)
    }

    static change_room_on_device(channel_obj, new_room, adapter){
        Smart_Button_Handler.set_new_configuration(channel_obj, channel_obj.native.id, channel_obj.common.name, adapter)
    }

    static change_channel_name(channel_obj, adapter){
        let state_name = channel_obj._id + '.state-button'
        adapter.getObject(state_name, function(err, state_obj){
            if(err){
                adapter.log.error(err);
                return
            }
            if(state_obj){
                state_obj.common.name = channel_obj.common.name
                adapter.setObject(state_name, state_obj)
            }
        })
        Smart_Button_Handler.set_new_configuration(channel_obj, channel_obj.native.id, channel_obj.common.name, adapter)
    }
}