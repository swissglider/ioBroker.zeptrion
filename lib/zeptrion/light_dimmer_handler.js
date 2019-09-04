'use strict';

const request = require('request')
const parseString = require('xml2js').parseString;

module.exports = class Light_Dimmer_Handler{
    constructor() {}

    static get_desc(){return 'Zeptrion Light Dimmer'}
    static get_role(){return 'light.dimmer'}

    static create_state(channel_obj, channel_id, adapter){
        let trans = {
            obj: channel_obj,
            channel_id: channel_id,
            adapter: adapter
        }
        let common1 = {
            name: channel_obj.common.name,
            def:   false,
            type:  "boolean",
            read:  true,
            write: true,
            role: 'dimmer.light',
            desc:  "Zeptrion Light Dimmer State On/Off",
            mobile: {
                admin: {
                    visible: true,
                    name: 'Dimmer',
                    type: 'Light'
                }
            }
        }
        adapter.createState(channel_obj.native.device, channel_obj.native.id, 'state-dimmer', common1, channel_obj.native, function(err, state_id){
            if(err){
                adapter.log.error(err);
                return
            }
            Light_Dimmer_Handler.update_current_zeptrion_states(this.obj, this.adapter)
            var wait_to_enum = ()=>{
                adapter.addStateToEnum('functions', 'Light', channel_obj.native.device, channel_obj.native.id, 'state-dimmer')
            }
            setTimeout(wait_to_enum, 300)
        }.bind(trans))

        // create the command state
        let common2 = {
            name: channel_obj.common.name,
            def:   '',
            type:  "string",
            read:  true,
            write: true,
            role: 'command',
            desc:  "Zeptrion Dimmer Commands",
            states: {
                stop: 'stop',
                on: 'on',
                off: 'off',
                toggle: 'toggle',
                dim_up: 'dim_up',
                dim_down: 'dim_down'
            },
            mobile: {
                admin: {
                    visible: true,
                    name: 'Commands'
                }
            }
        }
        common2.states['dim_up_' + adapter.config.zeptrionDimmerDimTime] = 'dim_up_t'
        common2.states['dim_down_' + adapter.config.zeptrionDimmerDimTime] = 'dim_down_t'
        adapter.createState(channel_obj.native.device, channel_obj.native.id, 'state-command', common2, channel_obj.native)
        var wait_to_enum = ()=>{
            adapter.addStateToEnum('functions', 'dimmer', channel_obj.native.device, channel_obj.native.id, 'state-command')
        }
    }

    static update_current_zeptrion_states(channel_obj, adapter){
        let trans = {
            obj: channel_obj,
            adapter: adapter
        }
        let state_name = channel_obj._id + '.state-dimmer'
        var url = 'http://' + channel_obj.native.addr + ":" + channel_obj.native.port + '/zrap/chscan/' + channel_obj.native.id
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
                let id = this.obj.native.id
                if(result && 'chscan' in result && id in result.chscan){
                    let state = result.chscan[id][0].val[0]
                    if(state === 0 || state === '0'){
                        state = false
                    }else{
                        state = true
                    }
                    this.adapter.setState(state_name, {val: state, ack: true});
                }
            }.bind(this))
        }.bind(trans))
    }

    static state_change_ack_false(state_id, new_state, obj, adapter){
        let command = {cmd:new_state.val}
        if(new_state.val === true){
            command = {cmd:'on'}
        }
        if(new_state.val === false){
            command = {cmd:'off'}
        }
        let url = "http://" + obj.native.addr + ":" + obj.native.port + "/zrap/chctrl/" + obj.native.id
        request.post({url:url, form: command}, function(err, res, body){
            if(err){
                adapter.log.error(err);
                return
            }
        })
    }

    static websocket_changed(channel_obj, value, adapter){
        let state
        if(value === 0 || value === '0'){
            state = false
        }else{
            state = true
        }
        let state_name = channel_obj._id + '.state-dimmer'
        adapter.setState(state_name, {val: state, ack: true});
    }

    static change_room_on_device(channel_obj, new_room, adapter){
        let command = {group:new_room}
        let url = "http://" + channel_obj.native.addr + ":" + channel_obj.native.port + "/zrap/chdes/" + channel_obj.native.id
        request.post({url:url, form: command}, function(err, res, body){
            if(err){
                adapter.log.error(err);
                return
            }
        })
    }

    static change_channel_name(channel_obj, adapter){
        let state_name = channel_obj._id + '.state-dimmer'
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
        let command = {name:channel_obj.common.name}
        let url = "http://" + channel_obj.native.addr + ":" + channel_obj.native.port + "/zrap/chdes/" + channel_obj.native.id
        request.post({url:url, form: command}, function(err, res, body){
            if(err){
                adapter.log.error(err);
                return
            }
        })
    }
}