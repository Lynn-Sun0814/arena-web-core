import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";

let frames = 0;
let frameSkip = 2;
let width = 320;
let debugFace = false, vidOff = false, overlayOff = false, bboxOn = false, flipped = false;

function setVideoStyle(elem) {
    elem.style.position = "absolute";
    elem.style.top = 0;
    elem.style.left = 0;
}

function setupVideo(displayCanv, displayOverlay, setupCallback) {
    window.videoElem = document.createElement("video");

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
    })
    .then(stream => {
        const videoSettings = stream.getVideoTracks()[0].getSettings();
        window.videoElem.srcObject = stream;
        window.videoElem.play();
    })
    .catch(function(err) {
        console.log("ERROR: " + err);
    });

    window.videoCanv = document.createElement("canvas");
    setVideoStyle(window.videoCanv);
    window.videoCanv.style.zIndex = 10;
    if (displayCanv) {
        document.body.appendChild(window.videoCanv);
    }

    if (displayOverlay) {
        window.overlayCanv = document.createElement("canvas");
        setVideoStyle(window.overlayCanv);
        window.overlayCanv.style.zIndex = 20;
        document.body.appendChild(window.overlayCanv);
    }

    window.videoElem.addEventListener("canplay", function(e) {
        window.width = width;
        window.height = window.videoElem.videoHeight / (window.videoElem.videoWidth / window.width);

        window.videoElem.setAttribute("width", window.width);
        window.videoElem.setAttribute("height", window.height);

        window.videoCanv.width = window.width;
        window.videoCanv.height = window.height;
        if (flipped) {
            window.videoCanv.getContext('2d').translate(window.width, 0);
            window.videoCanv.getContext('2d').scale(-1, 1);
        }

        if (displayOverlay) {
            window.overlayCanv.width = window.width;
            window.overlayCanv.height = window.height;
        }

        if (setupCallback != null) {
            setupCallback();
        }
    }, false);
}

function getFrame() {
    const videoCanvCtx = window.videoCanv.getContext("2d");
    videoCanvCtx.drawImage(
        window.videoElem,
        0, 0,
        window.width,
        window.height
    );
    return videoCanvCtx.getImageData(0, 0, window.width, window.height).data;
}

function hasFace(landmarks) {
    if (!landmarks || landmarks.length == 0) return false;

    let zeros = 0;
    for (let i = 0; i < landmarks.length; i++) {
        if (i % 2 == 0 && landmarks[i] > window.width) return false;
        if (i % 2 == 1 && landmarks[i] > window.height) return false;
        if (landmarks[i] == 0) {
            zeros++;
        }
    }
    // if many are 0's then there is no face
    return zeros <= landmarks.length / 3;
}

function drawBbox(bbox) {
    const overlayCtx = window.overlayCanv.getContext("2d");

    overlayCtx.beginPath();
    overlayCtx.strokeStyle = "red";
    overlayCtx.lineWidth = 2;

    // [x1,y1,x2,y2]
    overlayCtx.moveTo(bbox[0], bbox[1]);
    overlayCtx.lineTo(bbox[0], bbox[3]);
    overlayCtx.lineTo(bbox[2], bbox[3]);
    overlayCtx.lineTo(bbox[2], bbox[1]);
    overlayCtx.lineTo(bbox[0], bbox[1]);

    overlayCtx.stroke();
}

function drawPolyline(landmarks, start, end, closed) {
    const overlayCtx = window.overlayCanv.getContext("2d");

    overlayCtx.beginPath();
    overlayCtx.strokeStyle = "blue";
    overlayCtx.lineWidth = 2;

    overlayCtx.moveTo(landmarks[start][0], landmarks[start][1]);
    for (let i = start + 1; i <= end; i++) {
        overlayCtx.lineTo(landmarks[i][0], landmarks[i][1]);
    }
    if (closed) {
        overlayCtx.lineTo(landmarks[start][0], landmarks[start][1]);
    }

    overlayCtx.stroke();
}

function drawOverlay(landmarksRaw, bbox) {
    const overlayCtx = window.overlayCanv.getContext("2d");
    if (!landmarksRaw || landmarksRaw.length == 0) {
        overlayCtx.font = "20px Arial";
        overlayCtx.textAlign = "center";
        overlayCtx.fillText("Initalizing face detection...", window.overlayCanv.width/2, window.overlayCanv.height/2);
        return;
    }

    let landmarks = [];
    let face = hasFace(landmarksRaw);
    for (let i = 0; i < landmarksRaw.length; i += 2) {
        if (face) {
            const l = [landmarksRaw[i], landmarksRaw[i+1]];
            landmarks.push(l);
        }
        else {
            landmarks.push([0,0]);
        }
    }

    if (!vidOff) {
        overlayCtx.clearRect(
            0, 0,
            window.width,
            window.height
        );
    }
    else {
        overlayCtx.fillRect(
            0, 0,
            window.width,
            window.height
        );
    }

    if (bboxOn) {
        drawBbox(bbox);
    }

    drawPolyline(landmarks, 0,  16, false);   // Jaw line
    drawPolyline(landmarks, 17, 21, false);   // Left eyebrow
    drawPolyline(landmarks, 22, 26, false);   // Right eyebrow
    drawPolyline(landmarks, 27, 30, false);   // Nose bridge
    drawPolyline(landmarks, 30, 35, true);    // Lower nose
    drawPolyline(landmarks, 36, 41, true);    // Left eye
    drawPolyline(landmarks, 42, 47, true);    // Right Eye
    drawPolyline(landmarks, 48, 59, true);    // Outer lip
    drawPolyline(landmarks, 60, 67, true);    // Inner lip
}

function round3(num) {
    return parseFloat(num.toFixed(3));
}

function createFaceJSON(landmarksRaw, bbox, quat, trans, width, height) {
    let landmarksJSON = {};
    landmarksJSON["object_id"] = "face_" + globals.idTag;

    landmarksJSON["hasFace"] = hasFace(landmarksRaw);

    landmarksJSON["image"] = {};
    landmarksJSON["image"]["flipped"] = flipped;
    landmarksJSON["image"]["width"] = width;
    landmarksJSON["image"]["height"] = height;

    landmarksJSON["pose"] = {};
    let quatAdjusted = []
    for (let i = 0; i < 4; i++) {
        const adjustedQuat = landmarksJSON["hasFace"] ? round3(quat[i]) : 0;
        quatAdjusted.push(adjustedQuat);
    }
    landmarksJSON["pose"]["quaternions"] = quatAdjusted;

    let transAdjusted = []
    for (let i = 0; i < 3; i++) {
        const adjustedTrans = landmarksJSON["hasFace"] ? round3(trans[i]) : 0;
        transAdjusted.push(adjustedTrans);
    }
    landmarksJSON["pose"]["translation"] = transAdjusted;

    // landmarksJSON["frame"] = frame;

    let landmarksAdjusted = [];
    let maxX = 0, minX = window.width, maxY = 0, minY = window.height;
    for (let i = 0; i < 68*2; i += 2) {
        const adjustedX = landmarksJSON["hasFace"] ? round3((landmarksRaw[i]-width/2)/width) : 0;
        const adjustedY = landmarksJSON["hasFace"] ? round3((height/2-landmarksRaw[i+1])/height): 0 ;
        landmarksAdjusted.push(adjustedX);
        landmarksAdjusted.push(adjustedY);
    }
    landmarksJSON["landmarks"] = landmarksAdjusted;

    let bboxAdjusted = [];
    for (let i = 0; i < 4; i += 2) {
        const adjustedX = landmarksJSON["hasFace"] ? round3((bbox[i]-width/2)/width) : 0;
        const adjustedY = landmarksJSON["hasFace"] ? round3((height/2-bbox[i+1])/height): 0 ;
        bboxAdjusted.push(adjustedX);
        bboxAdjusted.push(adjustedY);
    }
    landmarksJSON["bbox"] = bboxAdjusted;

    return landmarksJSON;
}

window.detectFace = async function(frame, width, height) {
    let landmarksRaw = [], bbox = [], quat = [], trans = [];

    if (window.faceDetector !== undefined) {
        if (debugFace) console.time("detect_face_features");
        [landmarksRaw, bbox] = await window.faceDetector.detect(frame, width, height);
        // console.log(JSON.stringify(landmarksRaw))
        if (debugFace) console.timeEnd("detect_face_features");

        if (debugFace) console.time("get_pose");
        [quat, trans] = await window.faceDetector.getPose(landmarksRaw, window.width, window.height);
        if (debugFace) console.time("get_pose");

        if (debugFace) console.time("pub_to_broker");
        const globals = window.globals;
        const landmarksJSON = createFaceJSON(landmarksRaw, bbox, quat, trans, width, height);
        publish("realm/s/" + globals.renderParam + "/" + globals.idTag + "/face", landmarksJSON);
        // console.log(JSON.stringify(landmarksJSON))
        if (debugFace) console.timeEnd("pub_to_broker");
    }

    return [landmarksRaw, bbox];
}

async function processVideo() {
    if (frames % frameSkip == 0) {
        const [landmarksRaw, bbox] = await window.detectFace(getFrame(), window.width, window.height);
        if (!overlayOff) {
            if (debugFace && landmarksRaw && landmarksRaw.length > 0) console.log(landmarksRaw);
            drawOverlay(landmarksRaw, bbox);
        }
    }
    frames++;

    requestAnimationFrame(processVideo);
}

async function init() {
    const globals = window.globals;
    const urlParams = new URLSearchParams(window.location.search);

    if (!!urlParams.get("trackFace")) {
        const FaceDetector = Comlink.wrap(new Worker("/x/face/faceDetector.js"));

        flipped = !!urlParams.get("flipped");
        debugFace = !!urlParams.get("debugFace");
        vidOff = !!urlParams.get("vidOff");
        overlayOff = !!urlParams.get("overlayOff");
        bboxOn = !!urlParams.get("bboxOn");

        frameSkip = urlParams.get("frameSkip") ? parseInt(urlParams.get("frameSkip")) : 1;

        width = urlParams.get("vidWidth") ? parseInt(urlParams.get("vidWidth")) : 320;

        window.faceDetector = await new FaceDetector(Comlink.proxy(() => {
            setupVideo(!vidOff, !overlayOff, () => {
                requestAnimationFrame(processVideo);
            });
        }));
    }
}

init();
