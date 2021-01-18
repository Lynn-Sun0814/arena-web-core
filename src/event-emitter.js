
/** Class encapsulating an EventTarget for ARENA events.
 * See events and documentation of callbacks bellow
*/
export class ARENAEventEmitter {
    static events = {

        /**
         * Indicate user settings changed (currently, username changes). The event provides
         * the following parameters to its listeners (event.detail object):
         *
         * @callback onNewSettingsCallback
         * @param updated {object} dictionary of changed properties 
         */
        NEW_SETTINGS: 'new_settings',

        /**
        * Indicates we joined a jitsi conference (also on reconnect),
        * provides a list of current users/participants:
        * @typedef {Object} UserData
        * @param id {string} the ARENA id of the user
        * @param dn {string} the display name of the user
        * @param cn {string} the camera name of the user
        *
        * The following parameters are passed to listeners (event.detail object):
        * @callback jitsiConnectCallback
        * @param scene {string} the scene
        * @param pl {[]} participant list; array of {UserData} objects
        */
        JITSI_CONNECT: 'jitsi_connect',

        /**
         * Indicates a user joined. The event provides
         * the following parameters to its listeners (event.detail object):
         *
         * @callback userJoinCallback
         * @param id {string} the ARENA id of the user
         * @param dn {string} the display name of the user
         * @param cn {string} the camera name of the user
         * @param scene {string} the scene
         * @param src {string} the source of the event (see ARENAEventEmitter.sources below)
         */
        USER_JOINED: 'user_joined',

        /**
         * Indicates a user joined. The event provides
         * the following parameters to its listeners (event.detail object):
         *
         * @callback userJoinCallback
         * @param id {string} the ARENA id of the user
         * @param dn {string} the display name of the user
         * @param cn {string} the camera name of the user
         * @param scene {string} the scene
         * @param src {string} the source of the event (see ARENAEventEmitter.sources below)
         */
        SCREENSHARE: 'screenshare',

        /**
         * Indicates a user joined. The event provides
         * the following parameters to its listeners (event.detail object):
         *
         * @callback userLeftCallback
         * @param id {string} the ARENA id of the user
         * @param src {string} the source of the event (see ARENAEventEmitter.sources below)
         */
        USER_LEFT: 'user_left',

        /**
         * Indicates user authentication is done. The event provides
         * the following parameters to its listeners (event.detail object):
         *
         * @callback onAuthCallback
         * @param mqtt_username {string} the mqtt username (used to login into the server)
         * @param mqtt_token {string} the mqtt token (used to login into the server)
         */
        ONAUTH: 'onauth'
    };

    /**
    * Modules that are possible event sources
    * Used for events where the source is relevant/needed: {jitsiConnectCallback|userJoinCallback|userLeftCallback|...}
    *
    */
    static sources = {
        JITSI: 'jitsi',
        CHAT: 'chat',
    };

    /**
     * Create an event emitter.
     */
    constructor() {
        this._target = new EventTarget();
    }

    /**
     * Add a listner
     *
     * Ussage example:
     *
     *  on(ARENAEventEmitter.events.USER_JOINED, userJoinCallback);
     *
     *  Will register 'userJoinCallback' to be called when a USER_JOINED event is dispatched;
     *  userJoinCallback might look like:
     *
     *    userJoinCallback(e) {
     *      // event type should match, unless this function is registered as a callback for several different events
     *      if (e.type !==  ARENAEventEmitter.events.USER_JOINED) return;
     *      const args = e.detail; // receive arguments as defined by {userJoinCallback}
     *      console.log("User join: ", args.id, args.dn, args.cn, args.scene, args.src);
     *    }
     *
     * @param {string} eventName name of the event
     * @param {jitsiConnectCallback|userJoinCallback|userLeftCallback} listener callback (see callback definitions)
     * @return {undefined}
     */
    on(eventName, listener) {
        return this._target.addEventListener(eventName, listener);
    }

    /**
     * Event listner that is removed after being called once
     *
     * @param {string} eventName name of the event
     * @param {jitsiConnectCallback|userJoinCallback|userLeftCallback} listener callback
     * @return {undefined}
     */
    once(eventName, listener) {
        return this._target.addEventListener(eventName, listener, {once: true});
    }

    /**
     * Remove listner
     *
     * @param {string} eventName name of the event
     * @param {jitsiConnectCallback|userJoinCallback|userLeftCallback} listener callback
     * @return {undefined}
     */
    off(eventName, listener) {
        return this._target.removeEventListener(eventName, listener);
    }

    /**
     * Emit event
     *
     * Usage example:
     *  emit(ARENAEventEmitter.events.USER_JOINED, {id: '1356_X', dn: 'User X', cn: 'camera_1356_X',
     *   scene: 'ascene', src: ARENAEventEmitter.sources.JITSI});
     *
     *  Emits a USER_JOINED event, with the defined custom callback arguments: id, dn, cn, scene and
     *  src (see {userJoinCallback})
     *
     * @param {string} eventName name of the event
     * @param {Object} detail custom event properties
     * @return {undefined}
     */
    emit(eventName, detail) {
        // console.info("EVENT:", eventName, detail);
        return this._target.dispatchEvent(
            new CustomEvent(eventName, {detail, cancelable: true}),
        );
    }
}
