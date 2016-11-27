
// API OPTIONS
var locationsPath = "assets/locations.geojson";

// DISPLAY SETTINGS
var firstTableColumns = ['name', 'type', 'comments'];
var secondTableColumns = ['name', 'type', 'comments'];
var columnToDisplay={
  'name':'Name',
  'type': 'Type',
  'comments': "Comments"
};
var maxToDisplay=100;
var order = {
  "0":"Breakfast",
  "1": "Lunch"
};

// DO NOT MODIFY
var mapboxTiles = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png');
var map = L.map('mapid')
    .addLayer(mapboxTiles)
    .setView([37.75, -122.45], 12);
var svg = d3.select(map.getPanes().overlayPane).append("svg");
var g = svg.append("g").attr("class", "leaflet-zoom-hide");
var points, endPoints, color_scale, linePath, collection;
var thead, tbody, rows;
var numSelected=0;
var toLine = d3.line();
toLine
.x(function(d) {
    return applyLatLngToLayer(d).x
})
.y(function(d) {
    return applyLatLngToLayer(d).y
});
var transform = d3.geoTransform({
    point: projectPoint
});
var d3path = d3.geoPath().projection(transform);
function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
}

d3.select("#reset-button")
.on("click", reloadLocal);


function reloadLocal(){
  location.reload()
}

//Entry point for all the heavy lifting
d3.json(locationsPath, handleInitialJSON);

function handleInitialJSON(collection){
    if (!collection){
      return;
    }
    if (collection.length == 0){
      return;
    }
    totalCollection = collection;
    var pointsData = collection.features
    var featuresdata = pointsData.slice(0, maxToDisplay);

    color_scale= d3.scaleOrdinal(d3.schemeCategory10);

    createFirstTable(featuresdata);
    setupFirstMap(featuresdata, totalCollection);

    var runner = d3.select("#run-button")
    .on("click", handlePlanningRequest)
}

function handlePlanningRequest(){
    var selectedObjects = getSelectedObjects();
    if (selectedObjects.length>0){
      handlePlan(selectedObjects);
    }
  }

function handlePlan(selected){
  d3.select("#run-button").remove()
  d3.select("#reset-button")
  .classed("disabled", false)

  // var planData = processPlan(parsedResponse)

  createSecondTable(selected);

  d3.selectAll("circle").remove()
  setupSecondMap(selected, totalCollection);
}



function getSelectedObjects(){
  var selected = d3.selectAll('tr').filter(function(d){
    if (!d){
      return false;
    }
    return d.properties.selected==true}).data()

  var selectedIds = selected.map(function(selectedObj){
    return selectedObj;
  })
  return selectedIds;
}

function setupFirstMap(featuresdata, collection){
  points = g.selectAll()
      .data(featuresdata)
      .enter()
      .append("circle")
      .attr("class", "point")
      .on("mouseover", handlePointMouseOver)
      .on("mouseout", handlePointMouseOut)
      .on("click", handlePointMouseClick)
      .style("fill", pickPointBackgroundColor)

  map.on("viewreset", function(e){
    updatePointsLocations(collection);
  });
  map.on("zoomend", function(e){
    updatePointsLocations(collection);
  });
  updatePointsLocations(collection);
}

// TODO collection shouldnt be needed
function setupSecondMap(currentGeoJSON, collection){
  // linePath = g.selectAll(".lineConnect")
  //     .data(segmentJSON)
  //     .enter()
  //     .append("path")
  //     .attr("d", toLine)
  //     .attr("class", "lineConnect");
  //
  // endPoints = g.selectAll()
  //     .data(destinationGeoJSON)
  //     .enter()
  //     .append("circle")
  //     .on("mouseover", handleRebalancingMouseOver)
  //     .on("mouseout", handleRebalancingMouseOut)
  //     .attr("class", "endPoint");

  points = g.selectAll()
      .data(currentGeoJSON)
      .enter()
      .append("circle")
      .attr("class", "startPoint")
      .on("mouseover", handleRebalancingMouseOver)
      .on("mouseout", handleRebalancingMouseOut);

  map.on("viewreset", function(){
    updatePointsLocationsWithLine(collection);});
  map.on("zoomend", function(){
    updatePointsLocationsWithLine(collection);});
  updatePointsLocationsWithLine(collection);

  // linePath.each(function(d) {d.totalLength = this.getTotalLength(); });
  // lineTransition()
}

function updatePointsLocations(collection) {
    var bounds = d3path.bounds(collection),
    topLeft = bounds[0],
    bottomRight = bounds[1];
    // for the points we need to convert from latlong
    // to map units
    points.attr("transform",
        function(d) {
            return "translate(" +
                applyLatLngToLayer(d).x + "," +
                applyLatLngToLayer(d).y + ")";
        });

    // Setting the size and location of the overall SVG container
    svg.attr("width", bottomRight[0] - topLeft[0] + 120)
        .attr("height", bottomRight[1] - topLeft[1] + 120)
        .style("left", topLeft[0] - 50 + "px")
        .style("top", topLeft[1] - 50 + "px");

    g.attr("transform", "translate(" + (-topLeft[0] + 50) + "," + (-topLeft[1] + 50) + ")");

}

function updatePointsLocationsWithLine(collection) {

    var bounds = d3path.bounds(collection),
        topLeft = bounds[0],
        bottomRight = bounds[1];
    // for the points we need to convert from latlong
    // to map units
    points.attr("transform",
        function(d) {
            return "translate(" +
                applyLatLngToLayer(d).x + "," +
                applyLatLngToLayer(d).y + ")";
        });
    // endPoints.attr("transform",
    //     function(d) {
    //         return "translate(" +
    //             applyLatLngToLayer(d).x + "," +
    //             applyLatLngToLayer(d).y + ")";
    //     });

    // Setting the size and location of the overall SVG container
    svg.attr("width", bottomRight[0] - topLeft[0] + 120)
        .attr("height", bottomRight[1] - topLeft[1] + 120)
        .style("left", topLeft[0] - 50 + "px")
        .style("top", topLeft[1] - 50 + "px");

    // linePath.attr("d", toLine);
    // linePath.each(function(d) {d.totalLength = this.getTotalLength(); });

    g.attr("transform", "translate(" + (-topLeft[0] + 50) + "," + (-topLeft[1] + 50) + ")");

}

function createFirstTable(featuresdata){
  var table = d3.select("#table")
    .append("table")
  thead = table.append("thead");
  tbody = table.append("tbody")

  thead.append("tr")
    .selectAll("th")
    .data(firstTableColumns)
    .enter()
    .append("th")
    .text(function(d) { return columnToDisplay[d]; })

  rows = tbody.selectAll("tr")
    .data(featuresdata)
    .enter()
    .append("tr")
    .on("mouseover", handleCellMouseOver)
    .on("mouseout", handleCellMouseOut)
    .on("click", handleCellMouseClick);

  var cells = rows.selectAll("td")
    .data(function(row) {
        return firstTableColumns.map(function(column) {
            return {column: column, value: row.properties[column]};
        });
    })
    .enter()
    .append("td")
    .style("background-color", pickCellBackgroundColor)
    .style("color", pickCellFontColor)
    .html(pickCellDisplayText);
}

function createSecondTable(currentGeoJSON){
  var sel = thead
  .selectAll("tr")
  .selectAll("th")

  sel
  .data(secondTableColumns, function(d){
    return columnToDisplay[d];
  })
  .enter()
  .append("th")
  .text(function(d) {return columnToDisplay[d]; })

  sel
  .data(secondTableColumns, function(d){
    return columnToDisplay[d];
  })
  .exit()
  .remove()

  tbody
  .selectAll("tr")
  .remove();

  var newRows = tbody
  .selectAll("tr")
  .data(currentGeoJSON)
  .enter()
  .append("tr")
  .on("mouseover", handleRebalancingMouseOver)
  .on("mouseout", handleRebalancingMouseOut)
  rows = newRows;

  var cells = newRows.selectAll("td")
      .data(function(row) {
          var a = secondTableColumns.map(function(column) {
              if (column=='ticket_url'){
                var ticketStr = ticketBaseUrl + row.properties.vehicle_id;
                return {column: column, value: ticketStr};
              }else{
                return {column: column, value: row.properties[column]};
              }
          });
          return a
      })
      .enter()
      .append("td")
      .style("background-color", pickCellBackgroundColor)
      .html(pickCellDisplayText);

  // cells.filter(function(d, i) { return d.column === "ticket_url"})
  // .append("a")
  // .attr("href", function(d) {
  //     return d.value;
  // })
  // .attr("target", "_blank")
  // .html(function(d) {
  //     return "Create a Ticket!";
  // });

}

function lineTransition() {
    linePath
    .transition()
    .duration(4000)
    .delay(3000)
    .ease(d3.easeExpOut)
    .attrTween("stroke-dasharray", tweenDash)
    .on("end", function() {
        d3.select(this).call(lineTransition);// infinite loop
    });
}

function tweenDash(d, i) {
    return function(t) {
        var l = d.totalLength;
        interpolate = d3.interpolateString("0," + l, l + "," + l);
        return interpolate(t);
    }
}

function applyLatLngToLayer(d) {
    var y = d.geometry.coordinates[1]
    var x = d.geometry.coordinates[0]
    return map.latLngToLayerPoint(new L.LatLng(y, x))
}

function handleRebalancingMouseOver(d, i){
  // var line = linePath.filter(function(p, j) { return i === j; });
  var row = rows.filter(function(p, j) { return i === j; });
  var point = points.filter(function(p, j) { return i === j; });
  // var end = endPoints.filter(function(p, j) { return i === j; });
  var cells = row
  .selectAll("td");

  point.classed("hover", true)
  // end.classed("hover", true);
  cells.classed("hover", true);
  // line.classed("hover", true);
}

function handleRebalancingMouseOut(d, i){
  var row = rows.filter(function(p, j) { return i === j; });
  var point = points.filter(function(p, j) { return i === j; });
  // var end = endPoints.filter(function(p, j) { return i === j; });
  var cells = row
  .selectAll("td");


    point.classed("hover", false);
    // end.classed("hover", false);
    cells.classed("hover", false);
    // line.classed("hover", false);

}

function handlePointMouseOver(d, i){
    var row = rows.filter(function(p, j) { return i === j; });
    var cells = row
    .selectAll("td");
    var point = d3.select(this);
    point.classed("hover", true)
    cells.classed("hover", true);
}

function handlePointMouseOut(d, i){
    var row = rows.filter(function(p, j) { return i === j; });
    var cells = row
    .selectAll("td");
    var point = d3.select(this);

    var isSelected = checkIfPointSelected(row.data()[0])

    point.classed("hover", false);
    cells.classed("hover", false);
}

function checkIfPointSelected(row){
  if (!row["properties"].hasOwnProperty("selected")){
    return false;
  }
  return row["properties"]["selected"]
}

function handlePointMouseClick(d, i){
    var point = d3.select(this);
    var row = rows.filter(function(p, j) { return i === j; });
    var cells = row
      .selectAll("td");

    var rowData = row.data();
    var isSelected = checkIfPointSelected(rowData[0]);
    rowData[0]["properties"]["selected"] = !isSelected;

    point.classed("hover", false);
    cells.classed("hover", false);
    if(isSelected){
      numSelected--;
      point.classed("selected", false);
      cells.classed("selected", false);
    } else{
      numSelected++;
      point.classed("selected", true);
      cells.classed("selected", true);
    }
    updateButton()
}

function handleCellMouseOver(d, i){
    var point = points.filter(function(p, j) { return i === j; })
    var cells = d3.select(this)
    .selectAll('td');
    point.classed("hover", true);
    cells.classed("hover", true);
}

function handleCellMouseOut(d, i){
    var point = points.filter(function(p, j) { return i === j; })
    var cells = d3.select(this)
    .selectAll("td");

    var isSelected = checkIfPointSelected(d)

    point.classed("hover", false);
    cells.classed("hover", false);

}

function handleCellMouseClick(d, i){
    var point = points.filter(function(p, j) { return i === j; })
    var cells = d3.select(this)
    .selectAll("td");

    var isSelected = checkIfPointSelected(d);
    d["properties"]["selected"] = !isSelected;

    point.classed("hover", false);
    cells.classed("hover", false);
    if(isSelected){
      numSelected--;
      point.classed("selected", false);
      cells.classed("selected", false);
    } else{
      numSelected++;
      point.classed("selected", true);
      cells.classed("selected", true);
    }
    updateButton()
}

function updateClasses(cells, point, newClass){
  cells.attr("class", newClass);
  point.attr("class", newClass);
}

function updateButton(){
  var bttn = d3
  .select("#run-button")
  .classed("disabled", numSelected==0);
  var bttn = d3
  .select("#reset-button")
  .classed("disabled", numSelected==0);
}
function pickPointBackgroundColor(d, i ){
    return color_scale(d.properties.type)
}

function pickCellBackgroundColor(d, i ){
    if (d['column']=='type'){
      return color_scale(d.value)
    }
    return 'white'
}

function pickCellDisplayText(d, i ){
    return d.value
}

function pickCellFontColor(d,i){
  if (d['column']=='type'){
      return "white"
  }
  return "black"
}
