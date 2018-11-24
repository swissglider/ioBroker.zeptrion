/**
 *
 * zeptrion adapter
 *
 *
 *  file io-package.json comments:
 *
 *  {
 *      "common": {
 *          "name":         "zeptrion",                  // name has to be set and has to be equal to adapters folder name and main file name excluding extension
 *          "version":      "0.0.0",                    // use "Semantic Versioning"! see http://semver.org/
 *          "title":        "Node.js zeptrion Adapter",  // Adapter title shown in User Interfaces
 *          "authors":  [                               // Array of authord
 *              "name <mail@zeptrion.com>"
 *          ]
 *          "desc":         "zeptrion adapter",          // Adapter description shown in User Interfaces. Can be a language object {de:"...",ru:"..."} or a string
 *          "platform":     "Javascript/Node.js",       // possible values "javascript", "javascript/Node.js" - more coming
 *          "mode":         "daemon",                   // possible values "daemon", "schedule", "subscribe"
 *          "materialize":  true,                       // support of admin3
 *          "schedule":     "0 0 * * *"                 // cron-style schedule. Only needed if mode=schedule
 *          "loglevel":     "info"                      // Adapters Log Level
 *      },
 *      "native": {                                     // the native object is available via adapter.config in your adapters code - use it for configuration
 *          "test1": true,
 *          "test2": 42,
 *          "mySelect": "auto"
 *      }
 *  }
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
const Zeptrion_Hub = require(__dirname + '/lib/zeptrion/zeptrion_hub');
const Device_Handler = require(__dirname + '/lib/zeptrion/device_handler');
const Channel_Handler = require(__dirname + '/lib/zeptrion/channel_handler');
const Websocket = require(__dirname + '/lib/zeptrion/websocket');

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
            Websocket.stop_websocket(id)
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

    /**
     *
     *      For every state in the system there has to be also an object of type state
     *
     *      Here a simple zeptrion for a boolean variable named "testVariable"
     *
     *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
     *
     */

    // adapter.setObject('testVariable', {
    //     type: 'state',
    //     common: {
    //         name: 'testVariable',
    //         type: 'boolean',
    //         role: 'indicator'
    //     },
    //     native: {}
    // });

    // adapter.createDevice('testDevice', {},{},function(){
    //     console.log('TestDevice created')
    // })
    // adapter.createChannel('testDevice', 'testChannel', {},{},function(){
    //     console.log('testChannel created')
    // })
    // adapter.createState('testDevice', 'testChannel', 'testState1', 'button',{},function(){
    //     console.log('testState1 created')
    // })
    // adapter.createState('testDevice', 'testChannel', 'testState2', 'switch.light',{},function(){
    //     console.log('testState2 created')
    // })

    // adapter.addChannelToEnum('rooms', 'rooms', 'testDevice', 'testChannel',function(){
    //     console.log('testDevice added to room')
    //     adapter.getEnum('rooms', function(l){
    //         console.log(JSON.stringify(l))
    //     })
    // })

    // in this zeptrion all states changes inside the adapters namespace are subscribed

    // adapter.delForeignObject('enum.rooms.',function(err, i){
    //     console.log(err)
    //     console.log(i)
    // })

    console.log(adapter.config)

    adapter.subscribeStates('*');
    adapter.subscribeObjects('*')
    adapter.subscribeForeignObjects('enum*')
    var z_hub = new Zeptrion_Hub()
    var timeout = 10
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


    /**
     *   setState examples
     *
     *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
     *
     */

    // the variable testVariable is set to true as command (ack=false)
    // adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    // adapter.setState('testVariable', {val: true, ack: true});

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    // adapter.setState('testVariable', {val: true, ack: true, expire: 30});



}
