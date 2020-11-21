// language paperscript
// require https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.11.5/paper-full.min.js
/* eslint-disable */

// Paper Garden

// Generates and draws a garden!

// The script is configured to draw only a few plants here,
// so it doesn't take too long to run.

// If you have it draw a few hundred plants it can take several
// seconds to finish, and really high numbers of plants may cause
// the browser tab to crash.
/*global project Rectangle Point Group Path Color*/

////////////////////////////////////////////////
// composition settings
var WIDTH = 490;
var HEIGHT = 490;
var MARGIN = 30;

////////////////////////////////////////////////
// drawing settings
var GAPPY = 2;
var SLOPPY = 3;
var SHADOW_BLUR = 0;
var ROUGH = 0.1;
var STROKE = 1.0;


// sorting functions: sortTopDown, sortBottomUp, sortInnerOut, sortOuterIn
var PLANT_SORTING_FUNC = sortTopDown;
var LEAF_SORTING_FUNC = sortOuterIn;

////////////////////////////////////////////////
// plant settings

var PLANT_COUNT = 5; //50;
var PLANT_SPACING = 130;
var PLANT_CULL = 0.85;

var LEAF_COUNT = 70;
var LEAF_RADIUS = 18;
var LEAF_SPACING = 25;


///////////////////////////////////////////
// kick off
makeScene();

///////////////////////////////////////////
// application

function makeScene() {
  // clear drawing
  project.activeLayer.removeChildren();

  // draw plants
  createPlants();

  // fit drawing onto canvas
  project.activeLayer.fitBounds(
    new Rectangle(
      0 + MARGIN,
      0 + MARGIN,
      WIDTH - MARGIN * 2,
      HEIGHT - MARGIN * 2
    )
  );
}

///////////////////////////////////////////
// composition planning

function createPlants() {
  // create a cluster of points
  var points = clusterPoints(new Point(0, 0), PLANT_COUNT, PLANT_SPACING);

  // remove a few random points to create some gaps
  shuffle(points);
  points.splice(0, points.length * PLANT_CULL);

  // sort points
  points.sort(PLANT_SORTING_FUNC);

  // center cluster
  for (var i = 0; i < points.length; i++) {
    points[i] += new Point(WIDTH * 0.5, HEIGHT * 0.5);
  }

  // create and place plants
  var plants = [];
  for (i = 0; i < points.length; i++) {
    var point = points[i];
    var plant = createPlant();
    plants.push(plant);
    plant.name = "plant_" + i;
    plant.position = point;
  }

  return plants;
}

function createPlant() {
 
  // create a cluster of points for the leaves
  var points = clusterPoints(new Point(0, 0), LEAF_COUNT, LEAF_SPACING);

  // sort by distance from 0,0 so we draw the middle parts after the outer parts
  points.sort(LEAF_SORTING_FUNC);

  // make the parts
  var parts = new Group();
  var final = new Group();
  for (var i = 0; i < points.length; i++) {
    var point = points[i];
    // choose a random part generator (createLeaf, createFlower, createVine) from the config for this plant type

    var path = new Path.Circle(point, LEAF_RADIUS);
    path.name = "front";
    //   var pressure = randomRange(-0.5, 0.5);
    path.style = {
      //fillColor: new Color(1, 1, 1, 1),
      strokeColor: new Color(0.3, 0.3, 0.3), // + new Color(0.1, 0.1, 0.1) * pressure,
      strokeWidth: STROKE
    };
    var part = path
    part.name = "part_" + i;
    parts.addChild(part);
    console.log(parts.children.length)
    for (var j=0; j < parts.children.length-1; j++){ 
        if (part.index != j) {
        var result = subtract(    parts.children[j], part)
        if (result.removed.length >0) {
            j=0;
        }
        }
    }
    
    
    
  }

  for (var i=0; i < parts.children.length; i++){
    var red = i/parts.children.length;
    //console.log("Part: " + i + " red: " + red)

    parts.children[i].style = {
        //fillColor: new Color(1, 1, 1, 1),
        strokeColor: new Color(red, 0.3, 0.3), // + new Color(0.1, 0.1, 0.1) * pressure,
        strokeWidth: STROKE
      };
  }
/*
  var working = parts.lastChild;
  while(working) {
    
    var current=working
     
    while(current ) {
    console.log("Current: " + current.index + " working: " + working.index + " Total: " + parts.children.length)
    if (current != working){
        var result = subtract(    current, working)

    }
    current=current.previousSibling
}
working=working.previousSibling
    }
  */
 /*
 for (var h=parts.children.length-2; h>=0; h--) {
 var working = parts.children[h];
 for (var i=working.index-1; i >=0; i--) {

   
   var current=parts.children[i]
    
  
       var result = subtract(   current,    working)
      if (result) {
           for (var j = 0; j < result.removed.length; j++) {
               final.addChild(result.removed[j]);
               result.removed[j].strokeColor = "blue";
               result.removed[j].strokeWidth = 1;
           }
       
           //console.log(result.removed.length)
       }
  
}
 }*/

  return parts;
}


///////////////////////////////////////////
// point placing

function clusterPoints(center, point_count, spacing) {
  var points = [];
  for (var i = 0; i < point_count; i++) {
    points.push(center + randomPoint());
  }

  relaxPoints(points, spacing, spacing * 0.1, 30);

  return points;
}

function relaxPoints(points, min, stepSize, steps) {
  min = min * min;
  for (var step = 0; step < steps; step++) {
    for (var i1 = 0; i1 < points.length; i1++) {
      for (var i2 = 0; i2 < points.length; i2++) {
        if (i1 === i2) continue;
        var p1 = points[i1];
        var p2 = points[i2];
        var direction = (p1 - p2).normalize();
        var dist = p1.getDistance(p2, true);
        if (dist < min) {
          p1 = p1 + direction * stepSize;
          p2 = p2 - direction * stepSize;
        }
        points[i1] = p1;
        points[i2] = p2;
      }
    }
  }
}

// subtract(a, b) splits line `a` into segements and removes the segments that are inside line `b`
function subtract(a, b) {
  // line b has to be closed or subtract doesn't make sense
  //console.log("a: " + typeof(a) + " b: " + typeof(b)) 
  
  if (!b.closed) {
    console.log("B not closed")  
    return false;
  }
  // line a doesn't have to be closed, and if it is we need to put in a hairline cut to open it
  if (a.closed) {
    a.splitAt(0);
  }
  
  // find all the points where a crosses b
  var crossings = a.getCrossings(b);

  // the kept array lists the segments outside b
  // the removed array lists the segments inside b
  var kept = [];
  var removed = [];

  // start at the end of a, work backwards, cutting of segments
  for (var i = crossings.length - 1; i >= 0; i--) {
    // cut off a segement
    var splitPart = a.splitAt(crossings[i].offset);
    // check if it is inside b
    if (b.contains(splitPart.getPointAt(splitPart.length * 0.5))) {
      splitPart.remove();
      removed.push(splitPart);
    } else {
      kept.push(splitPart);
    }
  }

  // check what is left of line a
  if (b.contains(a.getPointAt(a.length * 0.5))) {
    a.remove();
    removed.push(a);
  } else {
    kept.push(a);
  }
    
  // return which segments were kept and removed (so the visualizer can put the removed ones back on the page)
  return {
    kept: kept,
    removed: removed
  };
}

function sortBottomUp(a, b) {
  return a.y > b.y ? -1 : 1;
}

function sortTopDown(a, b) {
  return a.y < b.y ? -1 : 1;
}

function sortOuterIn(a, b) {
  return a.length > b.length ? -1 : 1;
}

function sortInnerOut(a, b) {
  return a.length < b.length ? -1 : 1;
}

//////////////////////////////////////////
// Drawing + Style



///////////////////////////////////////////
// math + random utils

function map(x, inMin, inMax, outMin, outMax) {
  var n = (x - inMin) / (inMax - inMin);
  return n * (outMax - outMin) + outMin;
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomPoint() {
  return new Point(randomRange(-1, 1), randomRange(-1, 1));
}

function pick(a) {
  var i = Math.floor(Math.random() * a.length);
  return a[i];
}

function shuffle(a) {
  // https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
  var j, x;
  for (var i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

///////////////////////////////////////////
// DOWNLOAD SVG

// eslint-disable-next-line
function onKeyDown(event) {
  if (event.key === "s") {
    console.log("downloadAsSVG");
    downloadAsSVG();
  }
}

function downloadAsSVG(fileName) {
  // use default name if not provided
  fileName = fileName || "output.svg";

  // create a data url of the file
  var svgData = project.exportSVG({ asString: true });
  var url = "data:image/svg+xml;utf8," + encodeURIComponent(svgData);

  // create a link to the data, and "click" it
  var link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
}
