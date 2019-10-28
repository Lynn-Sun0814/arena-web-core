const timeID = new Date().getTime() % 10000;
var sceneObjects = new Object(); // This will be an associative array of strings and objects

// rate limit camera position updates
const updateMillis = 100;

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
	vars[key] = value;
    });
    return vars;
}
function getUrlParam(parameter, defaultvalue){
    var urlparameter = defaultvalue;
    if(window.location.href.indexOf(parameter) > -1){
	urlparameter = getUrlVars()[parameter];
    }
    if (urlparameter === "") return defaultvalue;
    return urlparameter;
}

var renderParam=getUrlParam('scene','render'); // scene name
var userParam=getUrlParam('name','X');
var themeParam=getUrlParam('theme','starry');
var weatherParam=getUrlParam('weather','none');
var mqttParamZ=getUrlParam('mqttServer','oz.andrew.cmu.edu');
var mqttParam='wss://'+mqttParamZ+'/mqtt';
// var mqttParam='ws://'+mqttParamZ+':9001/mqtt';
var fixedCamera=getUrlParam('fixedCamera','');

console.log(renderParam, userParam, themeParam);

outputTopic = "realm/s/"+renderParam+"/";
vioTopic = "/topic/vio/";
renderTopic = outputTopic+"#";

console.log(renderTopic);
console.log(outputTopic);

var camName = "";

var fallBox;
var fallBox2;
var cameraRig;
var my_camera;
var vive_leftHand;
var vive_rightHand;
var weather;
var date = new Date();

// Rate limiting variables
var oldMsg = "";
var lastUpdate = date.getTime();
var lastUpdateLeft = lastUpdate;
var lastUpdateRight = lastUpdate;
var stamp = lastUpdate;
var stampLeft = lastUpdate;
var stampRight = lastUpdate;

// Depending on topic depth, four message categories
var topicChildObject = renderTopic.split("/").length + 3;     // e.g: /topic/render/cube_1/sphere_2
var topicMultiProperty = renderTopic.split("/").length + 2;   // e.g: /topic/render/cube_1/material/color
var topicSingleComponent = renderTopic.split("/").length + 1; // e.g: /topic/render/cube_1/position
var topicAtomicUpdate = renderTopic.split("/").length;        // e.g: /topic/render/cube_1


//const client = new Paho.MQTT.Client(mqttParam, 9001, "/mqtt", "myClientId" + timeID);
const client = new Paho.MQTT.Client(mqttParam, "myClientId" + timeID);

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

idTag = timeID + "_" + userParam; // e.g. 1234_eric
// set initial position of vive controllers (not yet used) to zero
// the comparison against this will, at startup, emit no 'changed' message
// but rather the message will only appear if/when an actual controller moves
var oldMsgLeft = "viveLeft_"+idTag+",0.000,0.000,0.000,0.000,0.000,0.000,1.000,0,0,0,#000000,on";
var oldMsgRight = "viveRight_"+idTag+",0.000,0.000,0.000,0.000,0.000,0.000,1.000,0,0,0,#000000,on";

if (fixedCamera !== '') {
    camName = "camera_" + fixedCamera + "_" + fixedCamera;
}
else {
    camName = "camera_" + idTag;      // e.g. camera_1234_eric
}
console.log("camName: " , camName);

viveLName = "viveLeft_" + idTag;  // e.g. viveLeft_9240_X
viveRName = "viveRight_" + idTag; // e.g. viveRight_9240_X

// Last Will and Testament message sent to subscribers if this client loses connection
var lwt = new Paho.MQTT.Message("");
lwt.destinationName = outputTopic+camName;
lwt.qos = 0;
lwt.retained = true;

client.connect({
    onSuccess: onConnect,
    willMessage: lwt
});

// Callback for client.connect()
function onConnect() {
    //console.log("onConnect");
    
    // Let's get the camera and publish it's presence over MQTT
    // slight hack: we rely on it's name being already defined in the HTML as "my-camera"
    // add event listener for camera moved ("poseChanged") event

    vive_leftHand = document.getElementById('vive-leftHand');
    vive_rightHand = document.getElementById('vive-rightHand');
    
    my_camera = document.getElementById('my-camera');     // this is an <a-camera>
    cameraRig = document.getElementById('CameraRig'); // this is an <a-entity>
    conixBox = document.getElementById('Box-obj');
    environs = document.getElementById('env');
    weather = document.getElementById('weather');
    Scene = document.querySelector('a-scene');
    fallBox = document.getElementById('fallBox');
    fallBox2 = document.getElementById('fallBox2');

    if (environs) {
		environs.setAttribute('environment', 'preset', themeParam);
	}
    if (weatherParam !== "none") {
		weather.setAttribute('particle-system', 'preset', weatherParam);
		weather.setAttribute('particle-system', 'enabled', 'true');
    } else if (weather) {
		weather.setAttribute('particle-system', 'enabled', 'false');
	}

    // make 'env' and 'box-obj' (from index.html) scene objects so they can be modified
    // Add them to our dictionary of scene objects
    sceneObjects['Scene'] = Scene;
    sceneObjects['env'] = environs;
    sceneObjects['Box-obj'] = conixBox;
    sceneObjects['Scene'] = Scene;
    sceneObjects['fallBox'] = fallBox;
    sceneObjects['fallBox2'] = fallBox2;
    sceneObjects['my-camera'] = my_camera;

    console.log('my-camera: ',camName);
    console.log('cameraRig: ', cameraRig);
    console.log('fallBox: ', sceneObjects[fallBox]);

    //lwt.destinationName = outputTopic+camName;

    // Publish initial camera presence
    var color = '#'+Math.floor(Math.random()*16777215).toString(16);
    let mymsg = {
    	object_id: camName,
		action: 'create',
		data: {
    		object_type: 'camera',
			position: { x: 0, y: 1.6, z: 0 },
			rotation: {	x: 0, y: 0, z: 0, w: 0 }
		}
	};

    publish(outputTopic+camName, mymsg);
    console.log("my-camera element", my_camera);

    my_camera.addEventListener('poseChanged', e => {
	//console.log(e.detail);

	let msg = {
		object_id: camName,
		action: 'update',
        type: 'object',
		data: {
			object_type: 'camera',
			position: {
				x: e.detail.x.toFixed(3),
				y: e.detail.y.toFixed(3),
				z: e.detail.y.toFixed(3),
			},
			rotation: {
				x: e.detail._x.toFixed(3),
				y: e.detail._y.toFixed(3),
				z: e.detail._z.toFixed(3),
				w: e.detail._w.toFixed(3),
				color: color
			}
		}
	};

	// rig updates for VIO

	// suppress duplicates
	//if (msg !== oldMsg) {
	if (true) {
	    //publish(outputTopic+camName, msg + "," + stamp / 1000); // extra timestamp info at end for debugging
	    publish(outputTopic+camName, msg ); // extra timestamp info at end for debugging
		oldMsg = msg;
		lastUpdate = stamp;
		//console.log("cam moved: ",outputTopic+camName, msg);

		if (fixedCamera !== '') {
		    
		    pos= my_camera.object3D.position;
		    rot = my_camera.object3D.quaternion;

/*		    var viomsg = camName+","+
			pos.x.toFixed(3)+","+
			pos.y.toFixed(3)+","+
			pos.z.toFixed(3)+","+
			rot.x.toFixed(3)+","+
			rot.y.toFixed(3)+","+
			rot.z.toFixed(3)+","+
			rot.w.toFixed(3)+
			",0,0,0,#000000,on"; */

			var viomsg = {
				object_id: camName,
				action: 'update',
                type: 'object',
				data: {
					position: {
						x: pos.x.toFixed(3),
						y: pos.toFixed(3),
						z: pos.toFixed(3),
					},
					rotation: {
						x: rot.x.toFixed(3),
						y: rot.y.toFixed(3),
						z: rot.z.toFixed(3),
						w: rot.w.toFixed(3),
						color: color
					}
				}
			};

		    publish(vioTopic+camName, viomsg);
		}
	    //}
	}
    });

    if (vive_leftHand) {
		vive_leftHand.addEventListener('viveChanged', e => {
			//console.log(e.detail);
			var objName = "viveLeft_" + idTag;
			/*
                var msg = objName+","+
                    e.detail.x.toFixed(3)+","+
                    e.detail.y.toFixed(3)+","+
                    e.detail.z.toFixed(3)+","+
                    e.detail._x.toFixed(3)+","+
                    e.detail._y.toFixed(3)+","+
                    e.detail._z.toFixed(3)+","+
                    e.detail._w.toFixed(3)+
                    ",0,0,0,#000000,on";
            */

			let msg = {
				object_id: objName,
				action: 'update',
                type: 'object',
				data: {
					object_type: 'viveLeft',
					position: {
						x: e.detail.x.toFixed(3),
						y: e.detail.y.toFixed(3),
						z: e.detail.y.toFixed(3),
					},
					rotation: {
						x: e.detail._x.toFixed(3),
						y: e.detail._y.toFixed(3),
						z: e.detail._z.toFixed(3),
						w: e.detail._w.toFixed(3),
						color: color
					}
				}
			};

			// suppress duplicates
			if (msg !== oldMsgLeft) {
				// rate limiting is handled in vive-pose-listener
				publish(outputTopic + objName, msg);
				oldMsgLeft = msg;
			}
		});
	}
    // realtime position tracking of right hand controller
    if (vive_rightHand) {
		vive_rightHand.addEventListener('viveChanged', e => {
			//console.log(e.detail);
			var objName = "viveRight_" + idTag;
			/*
                var msg = objName+","+
                    e.detail.x.toFixed(3)+","+
                    e.detail.y.toFixed(3)+","+
                    e.detail.z.toFixed(3)+","+
                    e.detail._x.toFixed(3)+","+
                    e.detail._y.toFixed(3)+","+
                    e.detail._z.toFixed(3)+","+
                    e.detail._w.toFixed(3)+
                    ",0,0,0,#000000,on";*/

			let msg = {
				object_id: objName,
				action: 'update',
                type: 'object',
				data: {
					object_type: 'viveRight',
					position: {
						x: e.detail.x.toFixed(3),
						y: e.detail.y.toFixed(3),
						z: e.detail.y.toFixed(3),
					},
					rotation: {
						x: e.detail._x.toFixed(3),
						y: e.detail._y.toFixed(3),
						z: e.detail._z.toFixed(3),
						w: e.detail._w.toFixed(3),
						color: color
					}
				}
			};

			// suppress duplicates
			if (msg !== oldMsgRight) {
				// rate limit
				//date = new Date();
				//stampRight = date.getTime();
				//if ((stampRight - lastUpdateRight) >= updateMillis) {

				publish(outputTopic + objName, msg);
				oldMsgRight = msg;
				//lastUpdateRight = stampRight;
				//console.log("viveRight moved: ",outputTopic+objName, msg);
				//}
			}
		});
	}
    // VERY IMPORTANT: remove retained camera topic so future visitors don't see it
    window.onbeforeunload = function(){
		publish(outputTopic+camName, {object_id: camName, action: "delete" });
		publish_retained(outputTopic+camName, ""); // no longer needed, don't retain head position
		publish(outputTopic+viveLName, {object_id: viveLName, action: "delete" });
		publish(outputTopic+viveRName, {object_id: viveRName, action: "delete" });
    };

    // ok NOW start listening for MQTT messages
    client.subscribe(renderTopic);
}


function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
	console.log(responseObject.errorMessage);
    } // reconnect
    client.connect({ onSuccess: onConnect });
}

const publish_retained = (dest, msg) => {
    //console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    message.retained = true;
    // message.qos = 2;
    client.send(message);
}

const publish = (dest, msg) => {
	if (typeof msg === 'object') {
		msg = JSON.stringify(msg);
	}
    //console.log('desint :', dest, 'msggg', msg)
    let message = new Paho.MQTT.Message(msg);
    message.destinationName = dest;
    client.send(message);
}

function isJson(str) {
    try {
	JSON.parse(str);
    } catch (e) {
	return false;
    }
    return true;
}

function onMessageArrived(message) {

    console.log(message.destinationName, message.payloadString);

    var theMessage = JSON.parse(message.payloadString);
    console.log(theMessage.object_id);

    switch (theMessage.action) {

    case "clientEvent":
	var entityEl = sceneObjects[theMessage.object_id];
	switch (theMessage.type) {

	case "mousedown":
	    var myPoint = new THREE.Vector3(parseFloat(theMessage.data.position.x),
					    parseFloat(theMessage.data.position.y),
					    parseFloat(theMessage.data.position.z));
	    var clicker = theMessage.data.source;

	    // emit a synthetic click event with ugly data syntax
	    entityEl.emit('mousedown', { "clicker": clicker, intersection:
					 {
					     point: myPoint }
				       }, true);
	    break;

	case "mouseup":
	    var myPoint = new THREE.Vector3(parseFloat(theMessage.data.position.x),
					    parseFloat(theMessage.data.position.y),
					    parseFloat(theMessage.data.position.z));
	    var clicker = theMessage.data.source;

	    // emit a synthetic click event with ugly data syntax
	    entityEl.emit('mouseup', { "clicker": clicker, intersection:
				       {
					   point: myPoint }
				     }, true);
	    break;

	default: // handle others here like mouseenter / mouseleave
	    return;
	    break; // never gets here haha
	}
    case "delete":
	// An empty message after an object_id means remove it
	var name = theMessage.object_id;
	//console.log(message.payloadString, topic, name);

	if (sceneObjects[name]) {
	    Scene.removeChild(sceneObjects[name]);
	    delete sceneObjects[name];
	    return;
	} else
	    console.log("Warning: " + name + " not in sceneObjects");
	break;

    case "create":
	var x,y,z,xrot,yrot,zrot,wrot,xscale,yscale,zscale,color;
	// parse out JSON
	if (theMessage.data.position) {
	    x = theMessage.data.position.x; y = theMessage.data.position.y; z = theMessage.data.position.z;
	}
	else { // useful defaults if unspecified
	    x = 0; y = 0; z = 0;
	}

	if (theMessage.data.rotation) {
	    xrot = theMessage.data.rotation.x; yrot = theMessage.data.rotation.y; zrot = theMessage.data.rotation.z; wrot = theMessage.data.rotation.w;
	}
	else { // useful defaults
	    xrot = 0; yrot = 0; zrot = 0; wrot = 1;
	}

	if (theMessage.data.scale) {
	    xscale = theMessage.data.scale.x; yscale = theMessage.data.scale.y; zscale = theMessage.data.scale.z;
	}
	else { // useful defaults
	    xscale = 1; yscale = 1; zscale = 1;
	}

	if (theMessage.data.color)
	    color = theMessage.data.color;
	else
	    color = "white";

	var object_id = theMessage.object_id;
	var type = theMessage.data.object_type;
	if (type === "cube") {type = "box"}; // different name in Unity
	if (type === "quad") {type = "plane"}; // also different

	//var name = type+"_"+theMessage.object_id;
	var name = theMessage.object_id;
	var quat = new THREE.Quaternion(xrot,yrot,zrot,wrot);
	var euler = new THREE.Euler();
	var foo = euler.setFromQuaternion(quat.normalize(),"YXZ");
	var vec = foo.toVector3();

	// Reduce, reuse, recycle!
	var entityEl;
	if (name in sceneObjects) {
	    entityEl = sceneObjects[name];
	    entityEl.setAttribute('visible', true); // might have been set invisible with 'off' earlier
	    //console.log("existing object: ", name);
	    //console.log(entityEl);
	} else { // CREATE NEW SCENE OBJECT		

	    if (type === "viveLeft" || type === "viveRight") {
		// create vive controller for 'other persons controller'
		entityEl = document.createElement('a-entity');
		entityEl.setAttribute('id', name);
		entityEl.setAttribute('rotation.order' , "YXZ");
		//entityEl.setAttribute('obj-model', "obj: #viveControl-obj; mtl: #viveControl-mtl");
		if (type === "viveLeft")
		    entityEl.setAttribute("gltf-model", "url(models/valve_index_left.gltf)");
		else
		    entityEl.setAttribute("gltf-model", "url(models/valve_index_right.gltf)");

		entityEl.object3D.position.set(0,0,0);
		entityEl.object3D.rotation.set(0,0,0);

		// Add it to our dictionary of scene objects
		Scene.appendChild(entityEl);
		sceneObjects[name] = entityEl;
	    }
	    else if (type === "camera") {
		entityEl = document.createElement('a-entity');
		entityEl.setAttribute('id', name+"_rigChild");
		entityEl.setAttribute('rotation.order' , "YXZ");
		entityEl.object3D.position.set(0,0,0);
		entityEl.object3D.rotation.set(0,0,0);

		var rigEl;
		rigEl = document.createElement('a-entity');
		rigEl.setAttribute('id', name);
		rigEl.setAttribute('rotation.order' , "YXZ");
		rigEl.object3D.position.set(0,0,0);
		rigEl.object3D.rotation.set(0,0,0);

		// this is the head 3d model
		childEl = document.createElement('a-entity');
		childEl.setAttribute('rotation', 0+' '+180+' '+0);
		childEl.object3D.scale.set(4,4,4);
		childEl.setAttribute("gltf-model", "url(models/Head.gltf)");  // actually a face mesh

		// place a colored text above the head
		var headtext = document.createElement('a-text');
		var personName = name.split('_')[2];

		headtext.setAttribute('value', personName);
		headtext.setAttribute('position', 0 + ' ' + 0.6 + ' ' + 0.25);
		headtext.setAttribute('side', "double");
		headtext.setAttribute('align', "center");
		headtext.setAttribute('anchor', "center");
		headtext.setAttribute('width', 5);
		headtext.setAttribute('scale', 0.8 + ' ' + 0.8 + ' ' + 0.8);
		headtext.setAttribute('color', color); // color
		entityEl.appendChild(headtext);
		entityEl.appendChild(childEl);

		rigEl.appendChild(entityEl);

		Scene.appendChild(rigEl);
		sceneObjects[name] = rigEl;

		entityEl = rigEl;

		console.log("their camera:", rigEl);
	    }
	    else {

		entityEl = document.createElement('a-entity');
		entityEl.setAttribute('id', name);
		entityEl.setAttribute('rotation.order' , "YXZ");
		Scene.appendChild(entityEl);
		// Add it to our dictionary of scene objects
		sceneObjects[name] = entityEl;
	    }
	}

	switch(type) {

	case "light":
	    entityEl.setAttribute('light', 'type', 'ambient');
	    // does this work for light a-entities ?
	    entityEl.setAttribute('light', 'color', color);
	    break;

	case "camera":
	    //console.log("Camera update", entityEl);
	    //console.log(entityEl.getAttribute('position'));
	    break;

	case "viveLeft":
	    break;
	case "viveRight":
	    break;

	case "image": // use special 'url' data slot for bitmap URL (like gltf-models do)
	    entityEl.setAttribute('geometry', 'primitive', 'plane');
	    entityEl.setAttribute('material', 'src', theMessage.data.url);
	    entityEl.setAttribute('material', 'shader', 'flat');
	    entityEl.object3D.scale.set(xscale,yscale,zscale);
	    break;

	case "line":
	    delete theMessage['object_type']; // guaranteed to be "line", but: pass only A-Frame digestible key-values to setAttribute()
	    entityEl.setAttribute('line', theMessage.data);
	    break;

	case "thickline":
	    delete theMessage['object_type']; // guaranteed to be "thickline" but pass only A-Frame digestible key-values to setAttribute()
	    entityEl.setAttribute('meshline', theMessage.data);
	    break;

	case "particle":
	    delete theMessage['object_type']; // pass only A-Frame digestible key-values to setAttribute()
	    entityEl.setAttribute('particle-system', theMessage.data);
	    break;

	case "gltf-model":
	    //entityEl.object3D.scale.set(xscale, yscale, zscale);
	    entityEl.setAttribute('scale', xscale+' '+ yscale+' '+ zscale);
	    entityEl.setAttribute("gltf-model", theMessage.data.url);
	    break;

	case "text":
	    // set a bunch of defaults
	    entityEl.setAttribute('text', 'value', theMessage.data.text);
	    entityEl.setAttribute('text', 'color', color);
	    entityEl.setAttribute('side', "double");
	    entityEl.setAttribute('align', "center");
	    entityEl.setAttribute('anchor', "center");
	    entityEl.setAttribute('width', 5); // the default for <a-text>
	    break;

	default:
	    // handle arbitrary A-Frame geometry primitive types
	    entityEl.setAttribute('geometry', 'primitive', type);
	    entityEl.object3D.scale.set(xscale,yscale,zscale);
	    entityEl.setAttribute('material', 'color', color);
	    break;
	}

	if (type !== 'line' && type !== 'thickline') {
	    // Common for all but lines: set position & rotation
	    entityEl.object3D.position.set(x,y,z);
	    entityEl.object3D.rotation.set(vec.x,vec.y,vec.z);
	}
	break;

    case "update":
	var name = theMessage.object_id;
	switch (theMessage.type) { // "object", "setParent", "setChild"
	case "rig":
	    if (name === camName) { // our camera Rig
		console.log("moving our camera rig, sceneObject: " + name);

		var x = theMessage.data.position.x;
		var y = theMessage.data.position.y;
		var z = theMessage.data.position.z;
		var xrot = theMessage.data.rotation.x;
		var yrot = theMessage.data.rotation.y;
		var zrot = theMessage.data.rotation.z;
		var wrot = theMessage.data.rotation.w;

		var quat = new THREE.Quaternion(xrot,yrot,zrot,wrot);
		var euler = new THREE.Euler();
		var foo = euler.setFromQuaternion(quat.normalize(),"YXZ");
		var vec = foo.toVector3();

		cameraRig.object3D.position.set(x,y,z);
		cameraRig.object3D.rotation.set(vec.x,vec.y,vec.z);
		//	    cameraRig.rotation.order = "YXZ"; // John this doesn't work here :(
	    }
	    break;

	case "object":
	    // our own camera/controllers: bail, this message is meant for all other viewers
	    if (name === camName)
		return;
	    if (name === viveLName)
		return;
	    if (name === viveRName)
		return;

	    // just setAttribute() - data can contain multiple attribute-value pairs
	    // e.g: { ... "action": "update", "attribute": "animation", "data": {"property": "rotation", "to": "0 360 0", "loop": "true", "dur": 10000}}' ... }

	    var entityEl = sceneObjects[theMessage.object_id];
	    if (entityEl) {
		entityEl.setAttribute(theMessage.attribute, theMessage.data);
	    }
	    else
		console.log("Warning: " + sceneObject + " not in sceneObjects");
	    break;

	case "setChild": // parent/child relationship e.g. /topic/render/parent_id/child -m "child_id"

	    var parentEl = sceneObjects[theMessage.object_id];
	    var childName = theMessage.data.child;
	    var childEl  = sceneObjects[theMessage.data.child];

	    // error checks
	    if (!parentEl) {
		console.log("Warning: " + parentEl + " not in sceneObjects");
		return;
	    }
	    if (!childEl) {
		console.log("Warning: " + childEl + " not in sceneObjects");
		return;
	    }

	    console.log("parent", parentEl);
	    console.log("child", childEl);

	    childEl.flushToDOM();
	    var copy = childEl.cloneNode(true);
	    copy.setAttribute("name", "copy");
	    copy.flushToDOM();
	    parentEl.appendChild(copy);
	    sceneObjects[childName] = copy;
	    // remove from scene
	    childEl.parentNode.removeChild(childEl);

	    console.log("parent", parentEl);
	    console.log("child", childEl);
	    break;

	case "setParent": // parent/child relationship e.g. /topic/render/child_id/parent -m "parent_id"

	    var childEl = sceneObjects[theMessage.object_id]; // scene object_id
	    var parentEl  = sceneObjects[theMessage.data.parent];
	    var childName = theMessage.object_id;

	    // error checks
	    if (!parentEl) {
		console.log("Warning: " + parentEl + " not in sceneObjects");
		return;
	    }
	    if (!childEl) {
		console.log("Warning: " + childEl + " not in sceneObjects");
		return;
	    }

	    console.log("parent", parentEl);
	    console.log("child", childEl);

	    childEl.flushToDOM();
	    var copy = childEl.cloneNode(true);
	    copy.setAttribute("name", "copy");
	    copy.flushToDOM();
	    parentEl.appendChild(copy);
	    sceneObjects[childName] = copy;
	    childEl.parentNode.removeChild(childEl);

	    console.log("parent", parentEl);
	    console.log("child", childEl);
	    break; // case "update"

	default:
	    console.log("EMPTY MESSAGE?", message.destinationName, message.payloadstring);
	    break;
	}
    }
}
