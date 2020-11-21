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
var WIDTH = 800;
var HEIGHT = 800;
var MARGIN = 30;

////////////////////////////////////////////////
// drawing settings
var GAPPY = 2;
var SLOPPY = 3;
var SHADOW_BLUR = 0;
var ROUGH = 0.1;
var STROKE = 1.0;
var DRAW_CIRCLE_FUNC = drawCircle;

// sorting functions: sortTopDown, sortBottomUp, sortInnerOut, sortOuterIn
var PLANT_SORTING_FUNC = sortTopDown;
var LEAF_SORTING_FUNC = sortOuterIn;

////////////////////////////////////////////////
// plant settings

var PLANT_COUNT = 50; //50
var PLANT_SPACING = 130;
var PLANT_CULL = 0.85;

var LEAF_COUNT = 70;
var LEAF_RADIUS = 18;
var LEAF_SPACING = 25;

////////////////////////////////////////////////
// plant configs

var plant_configs = [];
plant_configs.leafy = [createLeaf];
plant_configs.flowery = [createLeaf, createLeaf, createFlower];
plant_configs.viney = [createLeaf, createLeaf, createLeaf, createVine];
var plant_types = ["leafy", "flowery", "viney"];

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
    var plant = createPlant(point); //new Point(0, 0))//point);
    plants.push(plant);
    plant.name = "plant_" + i;
    //plant.position = point;
  }

  return plants;
}

function createPlant(plantPoint) {
  // choose a random plant type
  var plant_type = pick(plant_types);

  // create a cluster of points for the leaves
  //var points = clusterPoints(new Point(0, 0), LEAF_COUNT, LEAF_SPACING);
  var points = clusterPoints(plantPoint, LEAF_COUNT, LEAF_SPACING);


  // sort by distance from 0,0 so we draw the middle parts after the outer parts
  points.sort(LEAF_SORTING_FUNC);

  // make the parts
  var parts = new Group();
  for (var i = 0; i < points.length; i++) {
    var point = points[i];
    // choose a random part generator (createLeaf, createFlower, createVine) from the config for this plant type
    var part_function = pick(plant_configs[plant_type]);
    // make the part
    var part = part_function(point, LEAF_RADIUS,plantPoint);
    part.name = "part_" + i;
    parts.addChild(part);
    //console.log(parts.children.length)
  }

  return parts;
}

function createLeaf(center, radius) {
  var circle = DRAW_CIRCLE_FUNC(center, radius);
  removeHidden(circle);
  return circle;
}

function createFlower(center, radius, plantPoint) {
  var position = center;
  var diff = center - plantPoint
  var offset = diff / 4;

  var flower_group = new Group();
  for (var i = 0; i < 5; i++) {
    var r = map(i, 0, 5, radius, radius * 0.25);
    var circle = DRAW_CIRCLE_FUNC(position, r);
    flower_group.addChild(circle);
    removeHidden(circle);
    



    offset = offset + [0, radius * 0.3];
    offset *= 0.75;
    position += offset;
  }
  var position = center;
  var offset = diff / 4;

  for (var i = 0; i < 5; i++) {
    var r = map(i, 0, 5, radius, radius * 0.25);
    var circle = new Path.Circle(position, r * 0.8);
    circle.style = {
       
        strokeColor: "white",
        strokeWidth: STROKE
      };
    removeHidden(circle);
    circle.remove();

    offset = offset + [0, radius * 0.3];
    offset *= 0.75;
    position += offset;
  }


  return flower_group; //new Group([flower_group, blocker_group]);
}

function removeHidden(circle) {
    var t  = project.getItems({overlapping: circle.bounds})
    
    for (var j=0; j < t.length-1; j++) { 
        if (t[j] != circle) {
            var result = subtract(   t[j], circle)
        }
    } 
}

function createVine(center, radius) {
  var length = pick([8, 8, 8, 9, 9, 10, 20, 30, 40]);
  var offset_x = 0;

  var vine_group = new Group();
  for (var i = length; i >=0; i--) {
    var offset_point = [offset_x, i * radius * 0.6];
    offset_x += randomRange(-radius, radius) * 0.5;
    offset_x *= 0.5;
    var circle = DRAW_CIRCLE_FUNC(center + offset_point, radius * 0.4);
    vine_group.addChild(circle);
    //circle.sendToBack();
    removeHidden( circle);
    /*
    for (var j=0; j < vine_group.children.length-1; j++){ 
        if (circle.index != j) {
        var result = subtract(   vine_group.children[j], circle)
        if (result.removed.length >0) {
            j=0;
        }
        }
    }*/
  }

  vine_group.addChild(createLeaf(center, radius));

  return vine_group;
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

function drawCircle(center, radius) {
  // create backing blocker
  /*var back_path = new Path.Circle(center, radius + GAPPY);
  back_path.name = "back";
  back_path.translate(randomPoint() * SLOPPY);
  back_path.style = {
    fillColor: new Color(1, 1, 1, 1),
    shadowColor: new Color(1, 1, 1, 1),
    shadowBlur: SHADOW_BLUR,
    shadowOffset: 0
  };*/

  // create stroke circle
  var path = new Path.Circle(center, radius);
  path.name = "front";
  //   var pressure = randomRange(-0.5, 0.5);
  path.style = {
    //fillColor: new Color(1, 1, 1, 1),
    strokeColor: new Color(0.3, 0.3, 0.3), // + new Color(0.1, 0.1, 0.1) * pressure,
    strokeWidth: STROKE
  };

  for (var s = 0; s < path.segments.length; s++) {
    path.segments[s].point += randomPoint() * ROUGH * radius;
  }

  // add a dashed clone of the stroke to give some slight variation to weight and color
  /*var dash_path = path.clone();
  dash_path.style = {
    dashOffset: randomRange(0, 200),
    dashArray: [randomRange(0, 50), 200],
    strokeColor: new Color(0.3, 0.3, 0.3),
    strokeWidth: STROKE * 1.3,
    strokeCap: "round",
    fillColor: undefined,
    strokeScaling: true
  };*/

  return path; //new Group([back_path, path, dash_path]);
}

///////////////////////////////////////////
// math + random utils


// subtract(a, b) splits line `a` into segements and removes the segments that are inside line `b`
function subtract(a, b) {
    // line b has to be closed or subtract doesn't make sense
    //console.log("a: " + typeof(a) + " b: " + typeof(b)) 
        // the kept array lists the segments outside b
    // the removed array lists the segments inside b
    var kept = [];
    var removed = [];
    if (!b.closed) {
      console.log("B not closed")  
      return false;
    }
    if (a.className != "Path") {
        //console.log("A has children") 
        return {
            kept: kept,
            removed: removed
          };
    }
    // line a doesn't have to be closed, and if it is we need to put in a hairline cut to open it
    if (a.closed) {
      a.splitAt(0);
    }
    
    // find all the points where a crosses b
    var crossings = a.getCrossings(b);
  

  
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
