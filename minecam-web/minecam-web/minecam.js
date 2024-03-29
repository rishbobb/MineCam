// Get a Kalman Filter
var { KalmanFilter } = kalmanFilter;

// Options for the entire backend
class ProgramOptions {
  constructor() {
    // Head Movement
    this.head_sensitivity = 20;
    this.head_behaviorBackwardsIndex = 2;
    this.head_centerMeasurement = 10;
    this.head_lowPassRuns = 5;
    this.head_pitchOffset = -50;
    this.head_useKalmanFilter = true;
    this.head_useLinearInterpolation = true;
    this.head_linearInterpolationRuns = 5;
    this.head_linearInterpolationFactor = 3;

    // Pose Movement
    this.pose_mineSensitivity = 250;
    this.pose_mineFilteringRuns = 5;
    this.pose_walkSensitivity = 29;
    this.pose_walkFilteringRuns = 5;
    this.pose_jumpSensitivity = 100;
    this.pose_jumpDelay = 500;
    this.pose_mineVisibilityThreshold = 0.5;

    // Hand Movement
    this.hands_lowPassRuns = 2;
    this.hands_hotbarDelay = 500;
    this.hands_commandDelay = 700;
    this.hands_fingerThreshold = 10;
    this.hands_fingerRuns = 8;

    // Global Options
    this.global_render = true;
    this.global_logErrors = false;
    this.global_screenDimensions = [1920, 1080];
    this.global_cameraDimensions = [1920, 1080];
    this.global_printStatsToScreen = true;
    this.global_dataSpliceThreshold = 200;
    this.global_port = 6969;
    this.global_uiShowAdvancedOptions = false;

    // Callbacks
    this.global_processCallback = async () => {};
    this.head_processCallback = (object) => {};
    this.pose_processCallback = (object) => {};
    this.hands_processCallback = (object) => {};
    this.load_callback = () => {};

    // Input video element
    this.input = null;

    // Video Render Canvas for each engine
    this.videoRenderCanvas = null;
    this.headRenderCanvas = null;
    this.poseRenderCanvas = null;
    this.handsRenderCanvas = null;

    // Information writing areas for each engine
    this.videoInfo = null;
    this.headInfo = null;
    this.poseInfo = null;
    this.handsInfo = null;
  }
}

// Write info to screen helper class
class WriteBuffer {
  constructor() {
    this.info = "";
  }

  addInfo(info) {
    this.info = this.info + info + "<br>";
  }

  clear() {
    this.info = "";
  }
}

// Communication wrapper for communicating with the mod
class ModCommunicationWrapper {
  constructor(options) {
    this.socket = new WebSocket(`ws://localhost:${options.global_port}`);
  }

  send(data) {
    if (this.socket.readyState == this.socket.OPEN) {
      this.socket.send(data);
    }
  }

  sendHeadMovement(pitch, yaw, roll) {
    this.send(JSON.stringify({ type: 0, pitch: pitch, yaw: yaw, roll: roll }));
  }

  sendLeftHandMovement(fingerx, fingery, pressed) {
    this.send(
      JSON.stringify({
        type: 1,
        fingerx: fingerx,
        fingery: fingery,
        pressed: pressed,
      })
    );
  }

  sendRightHandMovement(fingercount) {
    this.send(JSON.stringify({ type: 2, fingercount: fingercount }));
  }

  sendBodyMovement(mining, walking, jumping) {
    this.send(
      JSON.stringify({
        type: 3,
        mining: mining,
        walking: walking,
        jumping: jumping,
      })
    );
  }

  sendHotbarChange(slot) {
    this.send(JSON.stringify({ type: 4, slot: slot }));
  }
}

// Profile for controlling behavior of head movement
class HeadMovementProfile {
  constructor(options) {
    this.resultQueue = null;
    this.options = options;
  }

  updateResultQueue(resultQueue) {
    this.resultQueue = resultQueue;
  }

  shouldMoveYaw(resultQueue) {
    this.updateResultQueue(resultQueue);

    if (this.isLookingCenter()) {
      return true;
    } else if (
      this.isLookingRight() &&
      this.goingLeft(0, this.options.head_behaviorBackwardsIndex)
    ) {
      return false;
    } else if (
      this.isLookingLeft() &&
      this.goingRight(0, this.options.head_behaviorBackwardsIndex)
    ) {
      return false;
    } else {
      return true;
    }
  }

  goingLeft(i, i2) {
    if (
      this.resultQueue[this.resultQueue.length - (i + 1)][1] >
      this.resultQueue[this.resultQueue.length - (i2 + 1)][1]
    ) {
      return true;
    }
    return false;
  }

  goingRight(i, i2) {
    if (
      this.resultQueue[this.resultQueue.length - (i + 1)][1] <
      this.resultQueue[this.resultQueue.length - (i2 + 1)][1]
    ) {
      return true;
    }
    return false;
  }

  isLookingLeft() {
    if (
      Math.abs(this.resultQueue[this.resultQueue.length - 1][1]) <
      this.options.head_centerMeasurement
    ) {
      return false;
    } else if (
      Math.abs(this.resultQueue[this.resultQueue.length - 1][1]) ==
      this.resultQueue[this.resultQueue.length - 1][1]
    ) {
      return true;
    } else {
      return false;
    }
  }

  isLookingRight() {
    if (
      Math.abs(this.resultQueue[this.resultQueue.length - 1][1]) <
      this.options.head_centerMeasurement
    ) {
      return false;
    } else if (
      Math.abs(this.resultQueue[this.resultQueue.length - 1][1]) ==
      this.resultQueue[this.resultQueue.length - 1][1]
    ) {
      return false;
    } else {
      return true;
    }
  }

  isLookingCenter() {
    if (
      Math.abs(this.resultQueue[this.resultQueue.length - 1][1]) <
      this.options.head_centerMeasurement
    ) {
      return true;
    } else {
      return false;
    }
  }
}

// Handles head movement
class HeadMovementHandler {
  constructor(com, options) {
    this.com = com;
    this.kFilter = new KalmanFilter({ observation: 3 });

    this.headMovementProfile = new HeadMovementProfile(options);
    this.sendHistory = [];
    this.resultQueue = [];
    this.yawOffset = 0;

    this.options = options;

    this.writeBuffer = new WriteBuffer();

    // Create facemesh
    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      enableFaceGeometry: true,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Set function to run on results
    this.faceMesh.onResults((results) => {
      try {
        this.onResults(results, this);
      } catch (e) {
        if (this.options.global_logErrors) {
          console.log("[HEAD]\n" + e + `\n${e.stack}`);
        }
      }
    });
  }

  // Draw the landmarks on screen
  drawLandmarks(results) {
    this.options.headRenderCanvas.canvasCtx.save();
    this.options.headRenderCanvas.canvasCtx.clearRect(
      0,
      0,
      this.options.headRenderCanvas.canvasElement.width,
      this.options.headRenderCanvas.canvasElement.height
    );
    this.options.headRenderCanvas.canvasCtx.drawImage(
      results.image,
      0,
      0,
      this.options.headRenderCanvas.canvasElement.width,
      this.options.headRenderCanvas.canvasElement.height
    );
    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_TESSELATION,
          {
            color: "#C0C0C070",
            lineWidth: 1,
          }
        );
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_RIGHT_EYE,
          {
            color: "#FF3030",
          }
        );
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_RIGHT_EYEBROW,
          {
            color: "#FF3030",
          }
        );
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_RIGHT_IRIS,
          {
            color: "#FF3030",
          }
        );
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_LEFT_EYE,
          {
            color: "#30FF30",
          }
        );
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_LEFT_EYEBROW,
          {
            color: "#30FF30",
          }
        );
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_LEFT_IRIS,
          {
            color: "#30FF30",
          }
        );
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_FACE_OVAL,
          {
            color: "#E0E0E0",
          }
        );
        drawConnectors(
          this.options.headRenderCanvas.canvasCtx,
          landmarks,
          FACEMESH_LIPS,
          {
            color: "#E0E0E0",
          }
        );
      }
    }
  }

  // Get pitch yaw roll
  getParams(results) {
    if (results.multiFaceGeometry) {
      for (const facegeometry of results.multiFaceGeometry) {
        const pt_matrix = facegeometry
          .getPoseTransformMatrix()
          .getPackedDataList();
        const pt_matrix_three_js_format = new THREE.Matrix4().fromArray(
          pt_matrix
        );
        const euler_angles = new THREE.Euler().setFromRotationMatrix(
          pt_matrix_three_js_format,
          "XYZ"
        );
        var pitch = THREE.MathUtils.radToDeg(euler_angles["x"]);
        var yaw = THREE.MathUtils.radToDeg(euler_angles["y"]);
        var roll = THREE.MathUtils.radToDeg(euler_angles["z"]);
        return { pitch, yaw, roll };
      }
    }
  }

  LERP([y, z, x], [y2, z2, x2], f = 0.3) {
    const v = new THREE.Vector3(x, y, z);
    v.lerp(new THREE.Vector3(x2, y2, z2), f);
    return [v.y, v.z, v.x];
  }

  // Run on results from facemesh
  onResults(results) {
    // Render
    if (this.options.global_render) {
      this.drawLandmarks(results);
    }

    if (results.multiFaceGeometry) {
      // Get {yaw, pitch, roll}
      let params = this.getParams(results);
      if (!params) {
        return;
      }
      let pitch = params.pitch;
      let yaw = params.yaw;
      let roll = params.roll;

      // Apply low pass filter
      for (let i = 0; i < this.options.head_lowPassRuns; i++) {
        try {
          pitch =
            (pitch +
              this.resultQueue[
                this.resultQueue.length - i
              ][0]) /
            2;
        } catch (e) {}
      }
      for (let i = 0; i < this.options.head_lowPassRuns; i++) {
        try {
          yaw =
            (yaw +
              this.resultQueue[
                this.resultQueue.length - i
              ][1]) /
            2;
        } catch (e) {}
      }
      for (let i = 0; i < this.options.head_lowPassRuns; i++) {
        try {
          roll =
            (roll +
              this.resultQueue[
                this.resultQueue.length - i
              ][2]) /
            2;
        } catch (e) {}
      }

      // Linear Interpolation
      if (this.options.head_useLinearInterpolation) {
        for (
          let i = 0;
          i < this.options.head_linearInterpolationRuns;
          i++
        ) {
          if (
            this.resultQueue[this.resultQueue.length - 1] !=
            undefined
          ) {
            this.resultQueue.push(
              this.LERP(
                this.resultQueue[this.resultQueue.length - 1],
                [pitch, yaw, roll],
                this.options.head_linearInterpolationFactor / 10
              )
            );
          }
        }
      }

      // Add to history
      this.resultQueue.push([pitch, yaw, roll]);

      // Apply kalman filter
      if (this.options.head_useKalmanFilter) {
        var res1 = this.kFilter.filterAll(this.resultQueue);
      } else {
        var res1 = this.resultQueue;
      }

      // Get latest result
      var res = res1[res1.length - 1];

      // Send to the mod
      if (
        this.headMovementProfile.shouldMoveYaw(this.resultQueue)
      ) {
        this.sendHistory.push({
          pitch:
            Math.trunc(res[0] * this.options.head_sensitivity) +
            this.options.head_pitchOffset,
          yaw:
            Math.trunc(res[1] * this.options.head_sensitivity) * -1 +
            this.yawOffset,
          roll: Math.trunc(res[2] * this.options.head_sensitivity),
        });
        this.com.sendHeadMovement(
          Math.trunc(res[0] * this.options.head_sensitivity) +
            this.options.head_pitchOffset,
          Math.trunc(res[1] * this.options.head_sensitivity) * -1 +
            this.yawOffset,
          Math.trunc(res[2] * this.options.head_sensitivity)
        );
      } else {
        this.yawOffset =
          this.sendHistory[this.sendHistory.length - 1].yaw -
          Math.trunc(res[1] * this.options.head_sensitivity) * -1;
        this.sendHistory.push({
          pitch:
            Math.trunc(res[0] * this.options.head_sensitivity) +
            this.options.head_pitchOffset,
          yaw: this.sendHistory[this.sendHistory.length - 1]
            .yaw,
          roll: Math.trunc(res[2] * this.options.head_sensitivity),
        });
        this.com.sendHeadMovement(
          Math.trunc(res[0] * this.options.head_sensitivity) +
            this.options.head_pitchOffset,
          this.sendHistory[this.sendHistory.length - 1].yaw,
          Math.trunc(res[2] * this.options.head_sensitivity)
        );
      }

      this.writeBuffer.addInfo("Pitch: " + res[0]);
      this.writeBuffer.addInfo("Yaw: " + res[1]);
      this.writeBuffer.addInfo("Roll: " + res[2]);

      this.options.head_processCallback(res);

      // Shave off queue for performance
      if (
        this.resultQueue.length >
        this.options.global_dataSpliceThreshold
      ) {
        this.resultQueue = this.resultQueue.splice(
          this.resultQueue.length / 2
        );
      }
    }
    // Refresh the render
    this.options.headRenderCanvas.canvasCtx.restore();
  }

  async send(x) {
    this.writeBuffer.clear();
    this.writeBuffer.addInfo("Head:");
    await this.faceMesh.send(x);
    // Write info
    if (this.options.global_printStatsToScreen) {
      this.options.headInfo.innerHTML = this.writeBuffer.info;
    }
  }
}

class PoseMovementHandler {
  constructor(com, options) {
    this.com = com;

    this.resultQueue = [];
    this.mineQueue = [];
    this.walkQueue = [];

    this.canJump = true;

    this.options = options;

    this.writeBuffer = new WriteBuffer();

    // Create pose
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.9,
    });

    // Set function to run on results
    this.pose.onResults((results) => {
      try {
        this.onResults(results, this);
      } catch (e) {
        if (this.options.global_logErrors) {
          console.log("[POSE]\n" + e + `\n${e.stack}`);
        }
      }
    });
  }

  // Draw the landmarks on screen
  drawLandmarks(results) {
    this.options.poseRenderCanvas.canvasCtx.save();
    this.options.poseRenderCanvas.canvasCtx.clearRect(
      0,
      0,
      this.options.poseRenderCanvas.canvasElement.width,
      this.options.poseRenderCanvas.canvasElement.height
    );
    this.options.poseRenderCanvas.canvasCtx.drawImage(
      results.image,
      0,
      0,
      this.options.poseRenderCanvas.canvasElement.width,
      this.options.poseRenderCanvas.canvasElement.height
    );
    drawConnectors(
      this.options.poseRenderCanvas.canvasCtx,
      results.poseLandmarks,
      POSE_CONNECTIONS,
      {
        visibilityMin: 0.65,
        color: "white",
      }
    );
    drawLandmarks(
      this.options.poseRenderCanvas.canvasCtx,
      Object.values(POSE_LANDMARKS_LEFT).map(
        (index) => results.poseLandmarks[index]
      ),
      { visibilityMin: 0.65, color: "white", fillColor: "rgb(255,138,0)" }
    );
    drawLandmarks(
      this.options.poseRenderCanvas.canvasCtx,
      Object.values(POSE_LANDMARKS_RIGHT).map(
        (index) => results.poseLandmarks[index]
      ),
      { visibilityMin: 0.65, color: "white", fillColor: "rgb(0,217,231)" }
    );
    drawLandmarks(
      this.options.poseRenderCanvas.canvasCtx,
      Object.values(POSE_LANDMARKS_NEUTRAL).map(
        (index) => results.poseLandmarks[index]
      ),
      { visibilityMin: 0.65, color: "white", fillColor: "white" }
    );
    this.options.poseRenderCanvas.canvasCtx.restore();
  }

  // Run on results from pose
  onResults(results) {
    // Render
    if (this.options.global_render) {
      this.drawLandmarks(results);
    }

    // Push to history
    this.resultQueue.push([
      results.poseLandmarks[16].y *
        this.options.global_screenDimensions[1],
      results.poseLandmarks[11].x *
        this.options.global_screenDimensions[0],
      results.poseLandmarks[11].y *
        this.options.global_screenDimensions[1],
      results.poseLandmarks[16].visibility,
    ]);

    // Mining
    let mining = null;
    let filteredMining = null;
    if (
      Math.abs(
        Math.abs(
          this.resultQueue[this.resultQueue.length - 1][0] -
            this.resultQueue[this.resultQueue.length - 1][2]
        ) -
          Math.abs(
            this.resultQueue[this.resultQueue.length - 2][0] -
              this.resultQueue[this.resultQueue.length - 2][2]
          )
      ) > this.options.pose_mineSensitivity
    ) {
      mining = true;
      filteredMining = true;
    } else {
      mining = false;
      for (let i = 0; i < this.options.pose_mineFilteringRuns; i++) {
        if (this.mineQueue[this.mineQueue.length - i]) {
          filteredMining = true;
        }
      }
      if (filteredMining == null) {
        filteredMining = false;
      }
    }
    if (
      this.resultQueue[this.resultQueue.length - 1][3] <
      this.options.pose_mineVisibilityThreshold
    ) {
      mining = false;
      filteredMining = false;
    }
    this.mineQueue.push(mining);
    this.writeBuffer.addInfo("Mining: " + filteredMining);

    // Walking
    let walking = null;
    let filteredWalking = null;
    if (
      Math.abs(
        this.resultQueue[this.resultQueue.length - 1][1] -
          this.resultQueue[this.resultQueue.length - 2][1]
      ) > this.options.pose_walkSensitivity
    ) {
      walking = true;
      filteredWalking = true;
    } else {
      walking = false;
      for (let i = 0; i < this.options.pose_walkFilteringRuns; i++) {
        if (this.walkQueue[this.walkQueue.length - i]) {
          filteredWalking = true;
        }
      }
      if (filteredWalking == null) {
        filteredWalking = false;
      }
    }
    this.walkQueue.push(walking);
    this.writeBuffer.addInfo("Walking: " + filteredWalking);

    // Jumping
    let jumping = false;
    if (
      Math.abs(
        this.resultQueue[this.resultQueue.length - 1][2] -
          this.resultQueue[this.resultQueue.length - 2][2]
      ) > this.options.pose_jumpSensitivity
    ) {
      if (this.canJump) {
        jumping = true;
        this.canJump = false;
        setTimeout(() => {
          this.canJump = true;
        }, this.options.pose_jumpDelay);
      }
    }
    this.writeBuffer.addInfo("Jumping: " + jumping);

    // Send data
    this.com.sendBodyMovement(filteredMining, filteredWalking, jumping);

    this.options.pose_processCallback({
      filteredMining,
      filteredWalking,
      jumping,
    });

    // Splice data
    if (
      this.resultQueue.length >
      this.options.global_dataSpliceThreshold
    ) {
      this.resultQueue = this.resultQueue.splice(
        this.resultQueue.length / 2
      );
    }
    if (
      this.mineQueue.length >
      this.options.global_dataSpliceThreshold
    ) {
      this.mineQueue = this.mineQueue.splice(
        this.mineQueue.length / 2
      );
    }
    if (
      this.walkQueue.length >
      this.options.global_dataSpliceThreshold
    ) {
      this.walkQueue = this.walkQueue.splice(
        this.walkQueue.length / 2
      );
    }
  }

  async send(x) {
    this.writeBuffer.clear();
    this.writeBuffer.addInfo("Pose:");
    await this.pose.send(x);
    if (this.options.global_printStatsToScreen) {
      this.options.poseInfo.innerHTML = this.writeBuffer.info;
    }
  }
}

class HandMovementHandler {
  constructor(com, options) {
    this.com = com;

    this.leftPressed = false;
    this.leftResultQueue = [];
    this.leftSent = null;

    this.rightIndexResultQueue = [];
    this.lastSentRightHand = 0;
    this.rightSent = null;

    this.hotbarSlot = 1;
    this.canSendHotbarUpdate = true;

    this.options = options;

    this.writeBuffer = new WriteBuffer();
    this.loaded = false;

    // Create hands
    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Set function to run on results
    this.hands.onResults((results) => {
      try {
        this.onResults(results, this);
      } catch (e) {
        if (this.options.global_logErrors) {
          console.log("[HANDS]\n" + e + `\n${e.stack}`);
        }
      }
    });
  }

  // Draw landmarks on screen
  drawLandmarks(results) {
    this.options.handsRenderCanvas.canvasCtx.save();
    this.options.handsRenderCanvas.canvasCtx.clearRect(
      0,
      0,
      this.options.handsRenderCanvas.canvasElement.width,
      this.options.handsRenderCanvas.canvasElement.height
    );
    this.options.handsRenderCanvas.canvasCtx.drawImage(
      results.image,
      0,
      0,
      this.options.handsRenderCanvas.canvasElement.width,
      this.options.handsRenderCanvas.canvasElement.height
    );
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(
          this.options.handsRenderCanvas.canvasCtx,
          landmarks,
          HAND_CONNECTIONS,
          {
            color: "#00FF00",
            lineWidth: 5,
          }
        );
        drawLandmarks(this.options.handsRenderCanvas.canvasCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });
      }
    }
    this.options.handsRenderCanvas.canvasCtx.restore();
  }

  // Iterate the hotbar counter
  iterateHotbar(plusminus) {
    if (plusminus == "plus") {
      if (this.hotbarSlot == 9) {
        this.hotbarSlot = 1;
      } else {
        this.hotbarSlot = this.hotbarSlot + 1;
      }
    }
    if (plusminus == "minus") {
      if (this.hotbarSlot == 1) {
        this.hotbarSlot = 9;
      } else {
        this.hotbarSlot = this.hotbarSlot - 1;
      }
    }
  }

  // Check if finger is actually up
  getFingerUp(index) {
    let isUp = true;
    for (let i = 0; i < this.options.hands_fingerRuns; i++) {
      if (
        this.rightIndexResultQueue[
          this.rightIndexResultQueue.length - (i + 1)
        ] != index
      ) {
        isUp = false;
      }
    }

    return isUp;
  }

  // Run on results from hands
  onResults(results) {
    // Render
    if (this.options.global_render) {
      this.drawLandmarks(results);
    }

    // Used for callback later on
    this.leftSent = null;
    this.rightSent = null;

    // Get index of each hand
    let leftIndex = null;
    let rightIndex = null;

    try {
      for (let i = 0; i < 2; i++) {
        if (results.multiHandedness[i].label == "Left") {
          leftIndex = i;
        }
        if (results.multiHandedness[i].label == "Right") {
          rightIndex = i;
        }
      }
    } catch (e) {}

    // Left hand processing
    if (leftIndex == 0 || leftIndex == 1) {
      // Get x and y
      let x =
        (1 - results.multiHandLandmarks[leftIndex][8].x) *
        this.options.global_screenDimensions[0];
      let y =
        results.multiHandLandmarks[leftIndex][8].y *
        this.options.global_screenDimensions[1];

      // Get x of another point to use for fist detection (click)
      let x2 =
        (1 - results.multiHandLandmarks[leftIndex][6].x) *
        this.options.global_screenDimensions[0];
      let y2 =
        results.multiHandLandmarks[leftIndex][6].y *
        this.options.global_screenDimensions[1];

      if (y2 < y) {
        if (!this.leftPressed) {
          this.leftPressed = true;
        }
      } else {
        if (this.leftPressed) {
          this.leftPressed = false;
        }
      }

      x =
        (1 - results.multiHandLandmarks[leftIndex][5].x) *
        this.options.global_screenDimensions[0];
      y =
        results.multiHandLandmarks[leftIndex][5].y *
        this.options.global_screenDimensions[1];

      // Low pass
      for (let i = 0; i < this.options.hands_lowPassRuns; i++) {
        try {
          x =
            (x +
              this.leftResultQueue[
                this.leftResultQueue.length - i
              ][0]) /
            2;
        } catch (e) {}
      }
      for (let i = 0; i < this.options.hands_lowPassRuns; i++) {
        try {
          y =
            (y +
              this.leftResultQueue[
                this.leftResultQueue.length - i
              ][1]) /
            2;
        } catch (e) {}
      }

      // Push to list of coords
      this.leftResultQueue.push([x, y]);

      this.com.sendLeftHandMovement(
        this.leftResultQueue[
          this.leftResultQueue.length - 1
        ][0],
        this.leftResultQueue[
          this.leftResultQueue.length - 1
        ][1],
        this.leftPressed
      );
      this.leftSent = {
        x: this.leftResultQueue[
          this.leftResultQueue.length - 1
        ][0],
        y: this.leftResultQueue[
          this.leftResultQueue.length - 1
        ][1],
        pressed: this.leftPressed,
      };

      this.writeBuffer.addInfo(
        `Left Hand:
              x: ${
                this.leftResultQueue[
                  this.leftResultQueue.length - 1
                ][0]
              } <br />
              y: ${
                this.leftResultQueue[
                  this.leftResultQueue.length - 1
                ][1]
              } <br />
              pressed: ${this.leftPressed}`
      );

      // Shave off queue for performance
      if (
        this.leftResultQueue.length >
        this.options.global_dataSpliceThreshold
      ) {
        this.leftResultQueue = this.leftResultQueue.splice(
          this.leftResultQueue.length / 2
        );
      }
    }

    // Right hand processing
    if (rightIndex == 0 || rightIndex == 1) {
      let fingercounter = 0;
      let fingers = [
        [8, 6],
        [12, 10],
        [16, 14],
        [20, 18],
      ];

      for (let i = 0; i < fingers.length; i++) {
        // Get x and y
        let x =
          (1 - results.multiHandLandmarks[rightIndex][fingers[i][0]].x) *
          this.options.global_screenDimensions[0];
        let y =
          results.multiHandLandmarks[rightIndex][fingers[i][0]].y *
          this.options.global_screenDimensions[1];

        // Get x of another point to use for fist detection (click)
        let x2 =
          (1 - results.multiHandLandmarks[rightIndex][fingers[i][1]].x) *
          this.options.global_screenDimensions[0];
        let y2 =
          results.multiHandLandmarks[rightIndex][fingers[i][1]].y *
          this.options.global_screenDimensions[1];

        if (y < y2) {
          fingercounter = fingercounter + 1;
        }
      }

      let x =
        (1 - results.multiHandLandmarks[rightIndex][4].x) *
        this.options.global_screenDimensions[0];

      let x2 =
        (1 - results.multiHandLandmarks[rightIndex][3].x) *
        this.options.global_screenDimensions[0];

      if (
        x > x2 &&
        Math.abs(x - x2) > this.options.hands_fingerThreshold
      ) {
        fingercounter = fingercounter + 1;
      }

      this.rightIndexResultQueue.push(fingercounter);

      if (fingercounter == 5) {
        if (this.canSendHotbarUpdate) {
          this.iterateHotbar("plus");
          this.com.sendHotbarChange(this.hotbarSlot);
          this.canSendHotbarUpdate = false;
          setTimeout(() => {
            this.canSendHotbarUpdate = true;
          }, this.options.hands_hotbarDelay);
        }
      }

      if (this.lastSentRightHand == 0) {
        if (this.getFingerUp(fingercounter)) {
          this.com.sendRightHandMovement(fingercounter);
          this.rightSent = fingercounter;
          this.lastSentRightHand = fingercounter;
          setTimeout(() => {
            this.lastSentRightHand = 0;
            this.com.sendRightHandMovement(0);
          }, this.options.hands_commandDelay);
        }
      }

      this.writeBuffer.addInfo(
        `Right Hand:
              Fingers held up: ${fingercounter} <br />
              Hotbar Slot: ${this.hotbarSlot}`
      );
    } else {
      this.com.sendRightHandMovement(6);
    }

    this.options.hands_processCallback({
      left: this.leftSent,
      right: this.rightSent,
      hotbar: this.hotbarSlot,
    });

    // Splice data
    if (
      this.leftResultQueue.length >
      this.options.global_dataSpliceThreshold
    ) {
      this.leftResultQueue = this.leftResultQueue.splice(
        this.leftResultQueue.length / 2
      );
    }
    if (
      this.rightIndexResultQueue.length >
      this.options.global_dataSpliceThreshold
    ) {
      this.rightIndexResultQueue =
        this.rightIndexResultQueue.splice(
          this.rightIndexResultQueue.length / 2
        );
    }

    if (!this.loaded) {
      this.loaded = true;
      this.options.load_callback();
    }
  }

  async send(x) {
    this.writeBuffer.clear();
    this.writeBuffer.addInfo("Hands:");
    await this.hands.send(x);
    if (this.options.global_printStatsToScreen) {
      this.options.handsInfo.innerHTML = this.writeBuffer.info;
    }
  }
}

// Packaging classes
class CanvasWrapper {
  constructor(canvasElement, canvasCtx) {
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasCtx;
  }
}

class MineCam {
  constructor(options) {
    this.options = options;
  }

  run() {
    this.com = new ModCommunicationWrapper(this.options);
    this.headMovementHandler = new HeadMovementHandler(this.com, this.options);
    this.poseMovementHandler = new PoseMovementHandler(this.com, this.options);
    this.handsMovementHandler = new HandMovementHandler(this.com, this.options);
    this.camera = new Camera(this.options.input, {
      onFrame: async () => {
        if (this.options.global_render) {
          this.options.videoRenderCanvas.canvasCtx.drawImage(
            this.options.input,
            0,
            0,
            this.options.videoRenderCanvas.canvasElement.width,
            this.options.videoRenderCanvas.canvasElement.height
          );
        }
        if (this.options.global_printStatsToScreen) {
          this.options.videoInfo.innerHTML =
            "Camera Dimensions: " + this.options.global_cameraDimensions;
        }
        await this.headMovementHandler.send({ image: this.options.input });
        await this.poseMovementHandler.send({ image: this.options.input });
        await this.handsMovementHandler.send({ image: this.options.input });
        await this.options.global_processCallback();
      },
      width: this.options.global_cameraDimensions[0],
      height: this.options.global_cameraDimensions[1],
    });
    this.camera.start();
  }
}

function getCanvasFromId(id) {
  return new CanvasWrapper(
    document.getElementById(id),
    document.getElementById(id).getContext("2d")
  );
}

function exampleLaunch() {
  const options = new ProgramOptions();

  options.input = document.getElementById("input_video");
  options.videoRenderCanvas = getCanvasFromId("output_canvas_video");
  options.headRenderCanvas = getCanvasFromId("output_canvas_head");
  options.poseRenderCanvas = getCanvasFromId("output_canvas_pose");
  options.handsRenderCanvas = getCanvasFromId("output_canvas_hands");

  options.videoInfo = document.getElementById("videoInfo");
  options.videoInfo = document.getElementById("headInfo");
  options.videoInfo = document.getElementById("poseInfo");
  options.videoInfo = document.getElementById("handsInfo");

  const minecam = new MineCam(options);
  minecam.run();
}

export {
  ProgramOptions,
  ModCommunicationWrapper,
  HeadMovementProfile,
  HeadMovementHandler,
  PoseMovementHandler,
  HandMovementHandler,
  CanvasWrapper,
  MineCam,
  getCanvasFromId,
  exampleLaunch,
};
