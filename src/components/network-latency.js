/* global AFRAME, ARENA */

/**
 * @fileoverview Perform periodic pings on MQTT to monitor network latency
 *
 * Open source software under the terms in /LICENSE
 * Copyright (c) 2020, The CONIX Research Center. All rights reserved.
 * @date 2020
 */

const Paho = require('paho-mqtt'); // https://www.npmjs.com/package/paho-mqtt

/**
 * Publish with qos of 2 for network graph to update latency
 * @module network-latency
 * @property {number} UPDATE_INTERVAL_MS=10000 - Interval to send the periodic pings (ms)
 *
 */
AFRAME.registerComponent('network-latency', {
    // publish empty message with qos of 2 for network graph to update latency
    init: function() {
        this.UPDATE_INTERVAL_MS = 10000; // updates every 10s
        this.tick = AFRAME.utils.throttleTick(this.tick, this.UPDATE_INTERVAL_MS, this);
        this.message = new Paho.Message('{ "type": "latency" }'); // send message type latency
        this.message.destinationName = ARENA.latencyTopic;
        this.message.qos = 2;
    },
    tick: (function(t, dt) {
        if (ARENA.Mqtt) {
            if (ARENA.Mqtt.isConnected()) {
                ARENA.Mqtt.send(this.message);
            }
        }
        if (ARENA.chat) {
            if (ARENA.chat.mqttc.isConnected()) {
                ARENA.chat.mqttc.send(this.message);
            }
        }
    }),
});
