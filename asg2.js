// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
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
let u_ModelMatrix;
let u_GlobalRotation;
// Globals related UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 0.5];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegments = 10;
let g_animalGlobalRotation = 0;
let g_headAngle = 0;
let g_armAngle1 = 200;
let g_armAngle2 = 200;
let g_feetAngle1 = 0;
let g_feetAngle2 = 0;
let g_tailAngle = 120;
let g_tail2Angle = 270;
let g_tail3Angle = 270;
var g_startTime = performance.now() / 1000.0;
var g_seconds = performance.now() / 1000.0 - g_startTime;
let g_animation = false;
let g_random = false;
let g_tailT = -0.05;
let g_eyeS = 2;
let cheekColor = [1, 0, 0, 1];

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

  gl.enable(gl.DEPTH_TEST);
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

  // Get the storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Get the storage location of u_GlobalRotation
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  if (!u_GlobalRotation) {
    console.log('Failed to get the storage location of u_GlobalRotation');
    return;
  }

  // Set an initial value for this matrix to identity
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// Set up actions for the HTML UI elements
function addActionsForHtmlUI() {
  // Size Slider Event
  document.getElementById("tailSlide").addEventListener("mousemove", function() { g_tailAngle = this.value; renderScene(); });
  document.getElementById("tail2Slide").addEventListener("mousemove", function() { g_tail2Angle = this.value; renderScene(); });
  document.getElementById("tail3Slide").addEventListener("mousemove", function() { g_tail3Angle = this.value; renderScene(); });
  document.getElementById("headSlide").addEventListener("mousemove", function() { g_headAngle = this.value; renderScene(); });

  document.getElementById("OnButton").onclick = function() { g_animation = true; };
  document.getElementById("OffButton").onclick = function() { g_animation = false; };

  // Segment Slider Event
  document.getElementById("angleSlide").addEventListener("mousemove", function () { g_animalGlobalRotation = this.value; renderScene(); });

  let isDragging = false;
  let lastX = 0;

  canvas.addEventListener("mousedown", (ev) => { if (ev.button === 0) { isDragging = true; lastX = ev.clientX; } if (ev.shiftKey && ev.button === 0) { g_random = true; } });

  document.addEventListener("mousemove", (ev) => { if (isDragging) { let deltaX = ev.clientX - lastX; g_animalGlobalRotation -= deltaX * 0.5; lastX = ev.clientX; renderScene(); } });

  document.addEventListener("mouseup", () => { isDragging = false; });
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

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  requestAnimationFrame(tick);
}

// Called by browser repeatedly whenever its time
function tick() {
  // Save the current time
  g_seconds = performance.now() / 1000.0 - g_startTime;
  // Update animation angles
  updateAnimationAngles();
  // Draw everything
  renderScene();
  // Tell the browser to update again when it has time
  requestAnimationFrame(tick);
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
  renderScene();
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

// Update the angles of everything if currently animated
function updateAnimationAngles() {
  if (g_animation) {
    g_headAngle = (15 * Math.sin(g_seconds * 2));
    g_armAngle1 = (15 * Math.sin(g_seconds * 2)) + 200;
    g_armAngle2 = (-15 * Math.sin(g_seconds * 2)) + 200;
    g_feetAngle1 = (20 * Math.sin(g_seconds * 2));
    g_feetAngle2 = (20 * Math.sin(g_seconds * 2));
    g_tailAngle = (22.5 * Math.sin(g_seconds * 4)) + 112.5;
  }

  if (g_random && g_tailT < 4 && g_eyeS < 4) {
    g_tailT += 0.02;
    g_eyeS += 0.02;
    cheekColor = [1, 1, 1, 1];
  } else {
    g_random = false;
    g_tailT = -0.05;
    g_eyeS = 2;
    cheekColor = [1, 0, 0, 1];
  }
}

// Draw every shape that is supposed to be in the canvas
function renderScene() {
  // Check the time at the start of this function
  var startTime = performance.now();

  // Pass the matrix to u_ModelMatrix attribute
  var globalRotMat = new Matrix4().rotate(g_animalGlobalRotation, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clear(gl.COLOR_BUFFER_BIT);

  let M = new Matrix4();
  let color = [1, 1, 0, 1];

  // Draw body
  M.setTranslate(-0.235, -0.5, 0.1);
  M.scale(0.4, 0.6, 0.4);
  drawCube(M, color);

  color = [0.40, 0.26, 0.13, 1];
  M.setTranslate(-0.235, -0.32, 0.101);
  M.scale(0.4, 0.05, 0.001);
  drawCube(M, color);

  color = [0.40, 0.26, 0.13, 1];
  M.setTranslate(-0.235, -0.42, 0.101);
  M.scale(0.4, 0.05, 0.001);
  drawCube(M, color);

  // Draw tail
  color = [0.40, 0.26, 0.13, 1];
  M.setIdentity();
  M.setTranslate(g_tailT, -0.4, 0.05);
  M.rotate(g_tailAngle, 1, 0, 0);
  var tailCoords = new Matrix4(M);
  M.scale(0.02, 0.14, 0.05);
  drawCube(M, color);

  color = [1, 1, 0, 1];
  M = tailCoords;
  M.translate(0, 0.09, -0.05);
  M.rotate(g_tail2Angle, 1, 0, 0);
  M.scale(0.02, 0.12, -0.05);
  drawCube(M, color);

  M.translate(0, 1, -1);
  M.scale(1, -0.5, 2);
  drawCube(M, color);

  M.translate(0, -2, -0.5);
  var tail2Coords = new Matrix4(M);
  M.scale(1, 3, 0.6);
  drawCube(M, color);

  M = tail2Coords;
  M.translate(0, 1.2, 0);
  M.rotate(g_tail3Angle, 1, 0, 0);
  M.scale(1, 3.5, 3.5);
  drawCube(M, color);
  
  // Draw head
  M.setTranslate(-0.235, 0, 0);
  M.rotate(g_headAngle, 0, 1, 0);
  var headCoords = new Matrix4(M);
  M.scale(0.4, 0.4, 0.4);
  drawCube(M, color);

  // Draw ears
  var ear1 = new Cone();
  ear1.matrix = headCoords;
  ear1.color = [1, 1, 0, 1];
  ear1.matrix.translate(0.07, 0.3, -0.2);
  ear1.matrix.rotate(0, 0, 0, 1);
  ear1.matrix.scale(0.07, 0.7, 0.07);
  ear1.render();

  var ear2 = new Cone();
  ear2.matrix = headCoords;
  ear2.color = [1, 1, 0, 1];
  ear2.matrix.translate(3.7, 0.005, -0.01);
  ear2.matrix.rotate(1, 0, 0, 1);
  ear2.matrix.scale(1, 1, 1);
  ear2.render();

  // Draw nose
  color = [0, 0, 0, 1];
  M = headCoords;
  M.translate(-2.3, -0.2, -2.6);
  M.rotate(-1, 0, 0, 1);
  M.scale(0.8, 0.05, 0.5);
  drawCube(M, color);

  // Draw eyes
  color = [0, 0, 0, 1];
  M.translate(-2, 2, -0.2);
  M.rotate(-1, 0, 0, 1);
  M.scale(1.5, g_eyeS, 1);
  drawCube(M, color);

  color = [0, 0, 0, 1];
  M.translate(2.4, 0, -0.2);
  M.rotate(1, 0, 0, 1);
  M.scale(1, 1, 1);
  drawCube(M, color);

  // Draw cheeks
  color = cheekColor;
  M.translate(-2.7, -1.5, 0.5);
  M.rotate(-1, 0, 0, 1);
  M.scale(1.2, 1.2, 1);
  drawCube(M, color);

  color = cheekColor;
  M.translate(2.3, -0.01, 0);
  M.rotate(1, 0, 0, 1);
  M.scale(1, 1, 1);
  drawCube(M, color);

  // Draw feet
  color = [1, 1, 0, 1];
  M.setIdentity();
  M.setTranslate(0.02, -0.55, -0.2);
  M.rotate(g_feetAngle1, 1 ,0, 0);
  M.scale(0.1, 0.05, 0.2);
  drawCube(M, color);

  color = [1, 1, 0, 1];
  M.setIdentity();
  M.setTranslate(-0.2, -0.55, -0.2);
  M.rotate(-g_feetAngle2, 1 ,0, 0);
  M.scale(0.1, 0.05, 0.2);
  drawCube(M, color);

  // Draw arms
  color = [1, 1, 0, 1];
  M.setIdentity();
  M.setTranslate(0.16, -0.1, -0.3);
  M.rotate(g_armAngle1, 1 , 0, 0);
  M.scale(0.05, 0.25, 0.1);
  drawCube(M, color);

  color = [1, 1, 0, 1];
  M.setIdentity();
  M.setTranslate(-0.285, -0.1, -0.3);
  M.rotate(g_armAngle2, 1 , 0, 0);
  M.scale(0.05, 0.25, 0.1);
  drawCube(M, color);

  // Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration) / 10, "numdot");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML.");
    return;
  }
  htmlElm.innerHTML = text;
}