
// API OPTIONS
var locationsPath = "assets/locations.geojson";

// DISPLAY SETTINGS
var columns = ['name', 'idle_time', 'battery_level', 'fuel_percent'];
var columnToDisplay={
  'name':'Vehicle Name',
  'idle_time': 'Idle Time',
  'battery_level': 'Battery Level',
  'fuel_percent': 'Fuel Percent',
  'dest_addr': 'Target Drop Off (within a km)',
  'ticket_url': 'Ticket Link'
}
var fuelLimit = 60;
var batteryLimit = 11.6;
var maxToDisplay = 20;

// DO NOT MODIFY
var mapboxTiles = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png');
var map = L.map('mapid')
    .addLayer(mapboxTiles)
    .setView([50.83, 4.36], 11);
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

d3.json(locationsPath, function(collection){
    if (!collection){
      return;
    }
    if (collection.length == 0){
      return;
    }
    var pointsData = collection.features
    var featuresdata = pointsData.slice(0, maxToDisplay);
    ///
    var maxIdleTime = d3.max( featuresdata, function(d) { return d['properties']['idle_time'] });
    var minIdleTime = d3.min( featuresdata, function(d) { return d['properties']['idle_time'] });
    var medianIdleTime = d3.median( featuresdata, function(d) { return d['properties']['idle_time'] });
    color_scale = d3.scaleLinear().domain([minIdleTime, medianIdleTime, maxIdleTime]).range(['yellow', 'orange', 'red']);

    var length = featuresdata.length

    createInitialTable(featuresdata)
    points = g.selectAll()
        .data(featuresdata)
        .enter()
        .append("circle")
        .attr("class", "point")
        .on("mouseover", handlePointMouseOver)
        .on("mouseout", handlePointMouseOut)
        .on("click", handlePointMouseClick)
        .style("fill", pickPointBackgroundColor)

    map.on("viewreset", updatePointsLocations);
    map.on("zoomend", updatePointsLocations);
    updatePointsLocations();

    // Reposition the SVG to cover the features.
    function updatePointsLocations() {
        var bounds = d3path.bounds(collection),
        topLeft = bounds[0],
        bottomRight = bounds[1];
        console.log(topLeft, bottomRight)
        console.log(d3path.bounds(featuresdata))
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
    function updatePointsLocationsWithLine() {
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
        endPoints.attr("transform",
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

        linePath.attr("d", toLine);
        linePath.each(function(d) {d.totalLength = this.getTotalLength(); });

        g.attr("transform", "translate(" + (-topLeft[0] + 50) + "," + (-topLeft[1] + 50) + ")");

    }

    var runner = d3.select("#run-button")
    .on("click", function(){
      var selected = d3.selectAll('tr').filter(function(d){
        if (!d){
          return false;
        }
        return d.properties.selected==true}).data()

      var selectedIds = selected.map(function(selectedObj){
        return selectedObj["properties"]["vehicle_id"];
      })

      if (selectedIds.length>0){
        d3.request(rebalancingPostUrl)
        .send("POST", JSON.stringify(selectedIds), function(resp){

          d3.select("#run-button").remove()
          d3.select("#reset-button")
          .classed("disabled", false)

          var objVals = JSON.parse(resp.responseText);
          var new_columns = ['name', 'dest_addr', 'ticket_url']

          var geoObj = objVals.map(function(ob){
            var properties = ob;
            var geometry={
              "coordinates":[ob["current_lon"],ob["current_lat"]],
              "type":"Point"
            }
            var res = {
              "properties": properties,
              "geometry": geometry,
              "type": "Feature"
            }
            return res
          })

          var sel = thead
          .selectAll("tr")
          .selectAll("th")

          sel
          .data(new_columns, function(d){
            return columnToDisplay[d];
          })
          .enter()
          .append("th")
          .text(function(d) {return columnToDisplay[d]; })

          sel
          .data(new_columns, function(d){
            return columnToDisplay[d];
          })
          .exit()
          .remove()

          tbody
          .selectAll("tr")
          .remove();

          var newRows = tbody
          .selectAll("tr")
          .data(geoObj)
          .enter()
          .append("tr")
          // .attr("height", rectSpace+ "%")
          .on("mouseover", handleRebalancingMouseOver)
          .on("mouseout", handleRebalancingMouseOut)
          rows = newRows;

          var cells = newRows.selectAll("td")
              .data(function(row) {
                  var a = new_columns.map(function(column) {
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
              .attr("style", "font-family: Courier")
              .style("background-color", pickCellBackgroundColor)
              .html(pickCellDisplayText);

            cells.filter(function(d, i) { return d.column === "ticket_url"})
            .append("a")
            .attr("href", function(d) {
                return d.value;
            })
            .attr("target", "_blank")
            .html(function(d) {
                return "Create a Ticket!";
            });

            d3.selectAll("circle").remove()

            var segmentArray = geoObj.map(function(segment){
              return [{
                      "properties":segment.properties,
                      "geometry":{
                        "coordinates":[segment.properties.current_lon, segment.properties.current_lat]
                      }
                    },
                    {
                      "properties":segment.properties,
                      "geometry":{
                        "coordinates":[segment.properties.dest_lon, segment.properties.dest_lat]
                      }
                    }]
            });

            var ends = geoObj.map(function(segment){
              return {
                      "properties":segment.properties,
                      "geometry":{
                        "coordinates":[segment.properties.dest_lon, segment.properties.dest_lat]
                      },
                      "type":"Feature",
                    }
            })

            linePath = g.selectAll(".lineConnect")
                .data(segmentArray)
                .enter()
                .append("path")
                .attr("d", toLine)
                .attr("class", "lineConnect");

            endPoints = g.selectAll()
                .data(ends)
                .enter()
                .append("circle")
                .on("mouseover", handleRebalancingMouseOver)
                .on("mouseout", handleRebalancingMouseOut)
                .attr("class", "endPoint");

            points = g.selectAll()
                .data(geoObj)
                .enter()
                .append("circle")
                .attr("class", "startPoint")
                .on("mouseover", handleRebalancingMouseOver)
                .on("mouseout", handleRebalancingMouseOut)

            map.on("viewreset", updatePointsLocationsWithLine);
            map.on("zoomend", updatePointsLocationsWithLine);
            updatePointsLocationsWithLine();

            linePath.each(function(d) {d.totalLength = this.getTotalLength(); });
            lineTransition()

        });
      }
    })
});

function createInitialTable(featuresdata){
  var table = d3.select("#table")
    .append("table")
  thead = table.append("thead");
  tbody = table.append("tbody")

  thead.append("tr")
    .selectAll("th")
    .data(columns)
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
        return columns.map(function(column) {
            return {column: column, value: row.properties[column]};
        });
    })
    .enter()
    .append("td")
    .style("background-color", pickCellBackgroundColor)
    .style("color", pickCellFontColor)
    .html(pickCellDisplayText);
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
  var line = linePath.filter(function(p, j) { return i === j; });
  var row = rows.filter(function(p, j) { return i === j; });
  var point = points.filter(function(p, j) { return i === j; });
  var end = endPoints.filter(function(p, j) { return i === j; });
  var cells = row
  .selectAll("td");

  point.classed("hover", true)
  end.classed("hover", true);
  cells.classed("hover", true);
  line.classed("hover", true);
}

function handleRebalancingMouseOut(d, i){
  var line = linePath.filter(function(p, j) { return i === j; });
  var row = rows.filter(function(p, j) { return i === j; });
  var point = points.filter(function(p, j) { return i === j; });
  var end = endPoints.filter(function(p, j) { return i === j; });
  var cells = row
  .selectAll("td");

  var isSelected = checkIfPointSelected(row.data()[0])
  if(isSelected){
    point.classed("hover", false);
    end.classed("hover", false);
    cells.classed("hover", false);
    line.classed("hover", false);
  } else{
    point.classed("hover", false);
    end.classed("hover", false);
    cells.classed("hover", false);
    line.classed("hover", false);
  }
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
}
function pickPointBackgroundColor(d, i ){
    return color_scale(d.properties.idle_time)
}

function pickCellBackgroundColor(d, i ){
    if (d['column']=='idle_time'){
      return color_scale(d.value)
    }
    return 'white'
}

function pickCellDisplayText(d, i ){
    if (d['column']=='idle_time'){
      var days = parseInt(d.value/(3600*24));
      var hours = parseInt((d.value - days*3600*24)/3600);
      var returnStr = days + ' days, ' + hours + ' hours'
      return returnStr
    }
    if (d['column']=='fuel_percent'){
      return d.value + '%'
    }
    if (d['column']=='ticket_url'){
      return "";
    }
    if (d['column']=='battery_level'){
      return d.value + 'V'
    }
    return d.value
}

function pickCellFontColor(d,i){
  if (d['column']=='fuel_percent'){
    if (d.value<fuelLimit){
        return "red"
    }
  }
  if (d['column']=='battery_level'){
    if (d.value<batteryLimit){
        return "red"
    }
  }
  return "black"
}
