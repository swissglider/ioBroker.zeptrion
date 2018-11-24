'use strict';

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
const Zeptrion_Hub = require(__dirname + '/lib/zeptrion/zeptrion_hub');
const Device_Handler = require(__dirname + '/lib/zeptrion/device_handler');
const Channel_Handler = require(__dirname + '/lib/zeptrion/channel_handler');

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.zeptrion.0
const adapter = new utils.Adapter('zeptrion');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
    //console.log('objectChange ' + id + ' ' + JSON.stringify(obj));
    if(!obj){
        if(id.startsWith('zeptrion.')){
            Device_Handler.stop_websocket(id)
        }
    }
    if(obj){
        let fromZeptrionAdapter = (obj.from === 'system.adapter.' + adapter.namespace)
        if(obj && 'type' in obj && obj.type === 'device' && fromZeptrionAdapter){
            //console.log('New Device: ' + id + ' ' + JSON.stringify(obj))
        }
        if(obj && 'type' in obj && obj.type === 'channel' && fromZeptrionAdapter){
            //console.log('New Channel: ' + id + ' ' + JSON.stringify(obj))
        }
        if(id.startsWith('enum.rooms.')){
            Channel_Handler.handle_rooms(id, obj, adapter)
        }
    }
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));
    // you can use the ack flag to detect if it is status (true) or command (false)
    if(state){
        let fromZeptrionAdapter = (state.from === 'system.adapter.' + adapter.namespace)
        if(id.endsWith('.state-name')){
            //console.log(state)
            Channel_Handler.change_channel_name(id, state, adapter)
        }
        if (state && state.ack == null) {
            adapter.log.info('ack is null!');
        }else if (state && state.ack == false) {
            // changed from iobroker gui
            if(fromZeptrionAdapter){
                //change from Zeptrion system adapter
            }
            else{
                Channel_Handler.state_change_ack_false(id, state, adapter)
            }
            //console.log(JSON.stringify(adapter, ' ', 3))
            adapter.log.info('ack is not set!');
        }else if(state && state.ack === true){
            adapter.log.info('ack is set!');
        }
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    
    if(typeof obj === 'object' && obj.command === 'new_browse'){
        start_browse(adapter)
    }
    if(typeof obj === 'object' && obj.command === 'update_all_state_switch'){
        update_all_state_switch(adapter)
    }
    if(typeof obj === 'object' && obj.command === 'renew_all_websockets'){
        renew_all_websockets(adapter)
    }
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function main() {

    adapter.subscribeStates('*');
    adapter.subscribeObjects('*')
    adapter.subscribeForeignObjects('enum*')
    start_browse(adapter)
}

function start_browse(adapter){
    var z_hub = new Zeptrion_Hub()
    var timeout = adapter.config.mdnsSearchTime
    z_hub.browse(timeout)
    z_hub.on('event', (res) => {
        Device_Handler.set_device(adapter, res)
    });
    z_hub.on('error', (e) => {
        console.log(e)
        adapter.log.error(e);
    });
    z_hub.on('finished', (res) => {
        //console.log('finished')
        z_hub.close()
    });
    z_hub.on('closed', () => {
        //console.log('closed')
    });
}

function update_all_state_switch(adapter){
    Device_Handler.update_current_zeptrion_states(adapter)
}

function renew_all_websockets(adapter){
    Device_Handler.renew_all_websockets(adapter)
}
