// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;
// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
// Globals related UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 0.5];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegments = 10;

var g_shapesList = [];

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

// Set up actions for the HTML UI elements
function addActionsForHtmlUI() {
  // Button Events (Shape Type)
  document.getElementById('green').onclick = function() {g_selectedColor = [0.0, 1.0, 0.0, 0.5]; };
  document.getElementById('red').onclick = function() {g_selectedColor = [1.0, 0.0, 0.0, 0.5]; };
  document.getElementById("clearButton").onclick = function() { g_shapesList = []; renderAllShapes(); };

  document.getElementById("pointButton").onclick = function() { g_selectedType = POINT };
  document.getElementById("triButton").onclick = function() { g_selectedType = TRIANGLE };
  document.getElementById("circleButton").onclick = function() { g_selectedType = CIRCLE };

  // Slider Events
  document.getElementById("redSlide").addEventListener("mouseup", function() { g_selectedColor[0] = this.value / 100; });
  document.getElementById("greenSlide").addEventListener("mouseup", function() { g_selectedColor[1] = this.value / 100; });
  document.getElementById("blueSlide").addEventListener("mouseup", function() { g_selectedColor[2] = this.value / 100; });

  // Size Slider Event
  document.getElementById("sizeSlide").addEventListener("mouseup", function() { g_selectedSize = this.value; });

  // Segment Slider Event
  document.getElementById("segmentSlide").addEventListener("mouseup", function () { g_selectedSegments = this.value; });

  document.getElementById("example-drawing").addEventListener("mouseup", function () { generateExample(); });
}

function main() {
  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  // Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) { if (ev.buttons == 1) { click(ev); }};

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function click(ev) {
  // Extract the event click and return it in WebGL coordinates
  let [x, y] = convertCoordinatesEventToGL(ev);

  // Create and store the new point
  let point;
  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
    point.segments = g_selectedSegments;
  }
  point.position = [x, y];
  point.color =  g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapesList.push(point);

  // Draw every shape that is supposed to be in the canvas
  renderAllShapes();
}

// Extract the event click and return it in WebGL coordinates
function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return([x, y]);
}

// Draw every shape that is supposed to be in the canvas
function renderAllShapes() {
  // Check the time at the start of this function
  var startTime = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_shapesList.length;
  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  } 

  // Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration) / 10, "numdot");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML.");
    return;
  }
  htmlElm.innerHTML = text;
}

// Triangle vertices list for Pokeball drawing
const drawing = [
  // Top
  { vertices: [-0.15, 0.5, 0.15, 0.5, 0.0, 0.0], color: [1.0, 0.0, 0.0, 1.0] },
  { vertices: [-0.4, 0.35, -0.15, 0.5, 0.0, 0.0], color: [1.0, 0.0, 0.0, 1.0] },
  { vertices: [-0.5, 0.1, -0.4, 0.35, 0.0, 0.0], color: [1.0, 0.0, 0.0, 1.0] },
  { vertices: [-0.5, 0.0, -0.5, 0.1, 0.0, 0.0], color: [1.0, 0.0, 0.0, 1.0] },
  { vertices: [0.15, 0.5, 0.4, 0.35, 0.0, 0.0], color: [1.0, 0.0, 0.0, 1.0] },
  { vertices: [0.4, 0.35, 0.5, 0.1, 0.0, 0.0], color: [1.0, 0.0, 0.0, 1.0] },
  { vertices: [0.5, 0.1, 0.5, 0.0, 0.0, 0.0], color: [1.0, 0.0, 0.0, 1.0] },
  // Bottom
  { vertices: [0.15, -0.5, -0.15, -0.5, 0.0, 0.0], color: [1.0, 1.0, 1.0, 1.0] },
  { vertices: [0.4, -0.35, 0.15, -0.5, 0.0, 0.0], color: [1.0, 1.0, 1.0, 1.0] },
  { vertices: [0.5, -0.1, 0.4, -0.35, 0.0, 0.0], color: [1.0, 1.0, 1.0, 1.0] },
  { vertices: [0.5, 0.0, 0.5, -0.1, 0.0, 0.0], color: [1.0, 1.0, 1.0, 1.0] },
  { vertices: [-0.15, -0.5, -0.4, -0.35, 0.0, 0.0], color: [1.0, 1.0, 1.0, 1.0] },
  { vertices: [-0.4, -0.35, -0.5, -0.1, 0.0, 0.0], color: [1.0, 1.0, 1.0, 1.0] },
  { vertices: [-0.5, -0.1, -0.5, 0.0, 0.0, 0.0], color: [1.0, 1.0, 1.0, 1.0] },
  // Middle
  { vertices: [-0.12, -0.12, -0.12, 0.12, 0.12, 0.12], color: [0.0, 0.0, 0.0, 1.0] },
  { vertices: [0.12, 0.12, 0.12, -0.12, -0.12, -0.12], color: [0.0, 0.0, 0.0, 1.0] },
  { vertices: [-0.09, -0.09, -0.09, 0.09, 0.09, 0.09], color: [1.0, 1.0, 1.0, 1.0] },
  { vertices: [0.09, 0.09, 0.09, -0.09, -0.09, -0.09], color: [1.0, 1.0, 1.0, 1.0] },
  { vertices: [-0.5, -0.016, -0.5, 0.016, -0.09, 0.016], color: [0.0, 0.0, 0.0, 1.0] },
  { vertices: [-0.09, -0.016, -0.09, 0.016, -0.5, -0.016], color: [0.0, 0.0, 0.0, 1.0] },
  { vertices: [0.5, 0.016, 0.5, -0.016, 0.09, -0.016], color: [0.0, 0.0, 0.0, 1.0] },
  { vertices: [0.09, 0.016, 0.09, -0.016, 0.5, 0.016], color: [0.0, 0.0, 0.0, 1.0] },
]

function generateExample() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (var i = 0; i < drawing.length; i += 1) {
    // Set triangle color
    var rgba = drawing[i].color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle(drawing[i].vertices);
  }
}