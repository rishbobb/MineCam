import { ProgramOptions, MineCam, getCanvasFromId } from "./minecam.js";

// MINECAM->SETUP

function updateOptions(programOptions) {
  localStorage.setItem("minecam_options_set", "true");
  localStorage.setItem("minecam_options", JSON.stringify(programOptions));
}

// Set up options for MineCam
var options = null;
if (localStorage.getItem("minecam_options_set") == "true") {
  options = JSON.parse(localStorage.getItem("minecam_options"));

  // Reset functions, as JSON does not support functions
  options.global_processCallback = async () => {};
  options.head_processCallback = (object) => {};
  options.pose_processCallback = (object) => {};
  options.hands_processCallback = (object) => {};
  options.load_callback = () => {};

  options.global_logErrors = false;
} else {
  options = new ProgramOptions();
  options.global_logErrors = false;
}

// Set load callback
options.load_callback = () => {
  // Show main content
  document.getElementById("loading").style.display = "none";
  document.getElementById("maincontent").style.display = "block";

  console.log("MineCam Loaded!");
};

// Set videos on page
options.input = document.getElementById("input_video");
options.videoRenderCanvas = getCanvasFromId("output_canvas_video");
options.headRenderCanvas = getCanvasFromId("output_canvas_head");
options.poseRenderCanvas = getCanvasFromId("output_canvas_pose");
options.handsRenderCanvas = getCanvasFromId("output_canvas_hands");

// Set stats on page
options.videoInfo = document.getElementById("videoInfo");
options.headInfo = document.getElementById("headInfo");
options.poseInfo = document.getElementById("poseInfo");
options.handsInfo = document.getElementById("handsInfo");

// Save options
updateOptions(options);

// Set up MineCam
const minecam = new MineCam(options);

// Run MineCam
minecam.run();

//MINECAM->UI

// Sliders

function getItemById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id == id) {
      return list[i];
    }
  }
}

let sliders = document.getElementsByClassName("slider");
let displays = document.getElementsByClassName("slide_display");
let componentlist = [];

for (let i = 0; i < sliders.length; i++) {
  componentlist.push({
    slider: sliders[i],
    slide_display: getItemById(displays, sliders[i].id),
  });
}

for (let i = 0; i < componentlist.length; i++) {
  let currentSlider = componentlist[i].slider;
  let currentDisplay = componentlist[i].slide_display;
  currentSlider.onchange = () => {
    options[currentSlider.id] = currentSlider.value;
    currentDisplay.innerHTML = options[currentSlider.id];
    updateOptions(options);
  };
}

for (let i = 0; i < componentlist.length; i++) {
  componentlist[i].slider.value = options[componentlist[i].slider.id];
  componentlist[i].slide_display.innerHTML =
    options[componentlist[i].slider.id];
}

// Dropdowns

document.getElementById(
  "camera_res"
).value = `${options.global_cameraDimensions[0]}x${options.global_cameraDimensions[1]}`;

document.getElementById(
  "display_res"
).value = `${options.global_screenDimensions[0]}x${options.global_screenDimensions[1]}`;

document.getElementById("camera_res").onchange = () => {
  var [x, y] = document.getElementById("camera_res").value.split("x");
  options.global_cameraDimensions = [x, y];
  updateOptions(options);
};

document.getElementById("display_res").onchange = () => {
  var [x, y] = document.getElementById("display_res").value.split("x");
  options.global_screenDimensions = [x, y];
  updateOptions(options);
};
