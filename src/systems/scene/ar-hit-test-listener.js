/* global AFRAME, ARENA */

import { ARENAUtils } from '../../utils';

AFRAME.registerComponent('ar-hit-test-listener', {
    schema: {
        enabled: { type: 'boolean', default: true },
    },

    init() {
        this.enterARHandler = this.enterARHandler.bind(this);
        this.exitARHandler = this.exitARHandler.bind(this);
        this.hitStartHandler = this.hitStartHandler.bind(this);
        this.hitEndHandler = this.hitEndHandler.bind(this);
        this.el.addEventListener('enter-vr', this.enterARHandler);
        this.el.addEventListener('exit-vr', this.exitARHandler);
    },

    remove() {
        this.el.removeEventListener('enter-vr', this.enterARHandler);
        this.el.removeEventListener('exit-vr', this.exitARHandler);
    },

    enterARHandler() {
        if (this.el.is('ar-mode')) {
            this.el.addEventListener('ar-hit-test-select-start', this.hitStartHandler);
            this.el.addEventListener('ar-hit-test-select', this.hitEndHandler);
        }
    },

    exitARHandler() {
        this.el.removeEventListener('ar-hit-test-select-start', this.hitStartHandler);
        this.el.removeEventListener('ar-hit-test-select', this.hitEndHandler);
    },

    hitStartHandler(evt) {
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const camPosition = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(camPosition);
        const { position, rotation } = ARENAUtils.setClickData(evt);

        if ('inputSource' in evt.detail) {
            // original hit-test event; simply publish to MQTT
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'hitstart',
                data: {
                    clickPos,
                    position,
                    rotation,
                    source: ARENA.camName,
                },
            };
            ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`, thisMsg);
        }
    },

    hitEndHandler(evt) {
        if (this.data.enabled === false) return;
        const camera = document.getElementById('my-camera');
        const camPosition = camera.components['arena-camera'].data.position;

        const clickPos = ARENAUtils.vec3ToObject(camPosition);
        const { position, rotation } = ARENAUtils.setClickData(evt);

        if ('inputSource' in evt.detail) {
            // original hit-test event; simply publish to MQTT
            const thisMsg = {
                object_id: this.el.id,
                action: 'clientEvent',
                type: 'hitend',
                data: {
                    clickPos,
                    position,
                    rotation,
                    source: ARENA.camName,
                },
            };
            ARENA.Mqtt.publish(`${ARENA.outputTopic}${ARENA.camName}`, thisMsg);
        }
    },
});
