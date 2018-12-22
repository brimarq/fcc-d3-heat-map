const dataUrl = "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json";
let json, req = new XMLHttpRequest();

/** Send http req */
req.open("GET", dataUrl ,true);
req.send();
req.onload = function() {
  json = JSON.parse(req.responseText);
  // d3.select("main div#svg-container").text(JSON.stringify(json));
  drawSvg();
};

// color scheme, hot to cold ['#a50026','#d73027','#f46d43','#fdae61','#fee090','#ffffbf','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695'] http://colorbrewer2.org/#type=diverging&scheme=RdYlBu&n=11

function drawSvg() {

  /** Set initial svg dimensions to 16:10 ratio */
  const w = 900;
  const h = w / 1.6;

  /** Set "margins" for the chart */
  const margin = {top: h * .1, right: w * .07, bottom: h * .1, left: w * .06};

  /** Set width and height for the chart */
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;

  /** Set the scales for x and y axes */
  const xScale = d3.scaleBand()
    .domain([...new Set(json.monthlyVariance.map(x => x.year))])
    .range([0 , width])
  ;

  const yScale = d3.scaleBand()
    .domain([...new Set(json.monthlyVariance.map(x => x.month -1))])
    .range([0, height]) 
  ; 

  /** Axes to be called */
  const xAxis = d3.axisBottom(xScale)
    // Return ticks only for year values that are divisible by 10
    .tickValues(xScale.domain().filter(function(d) { return !(d % 10)}));
  ;
  
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(function(d) {
      let formatMonth = d3.timeFormat("%B");
      return formatMonth(new Date(0, d));
    })
  ;

  /** Create svg element */
  const svg = d3.select("main div#svg-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  ;

  /** Create heatmap group */
  const heatmap = svg.append("g")
    .attr("id", "heatmap")
  ;

  /** Create heatmap axes */
  // heatmap x-axis 
  heatmap.append("g")
    .attr("id", "x-axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
  ;

  // heatmap y-axis
  heatmap.append("g")
    .attr("id", "y-axis")
    .attr("transform", "translate(0, 0)")
    .call(yAxis)
  ;

  /** Now, get heatmap bbox dimensions and bind that data to group */
  heatmap.each(function() {
    let data = {};
    data.bboxWidth = d3.format(".2~f")(this.getBBox().width);
    data.bboxHeight = d3.format(".2~f")(this.getBBox().height);
    d3.select("g#x-axis").each(function() {
      data.xAxisHeight = d3.format(".2~f")(this.getBBox().height)
    });
    d3.select("g#y-axis").each(function() {
      data.yAxisWidth = d3.format(".2~f")(this.getBBox().width)
    });
    d3.select(this).datum(data);
  });

  /** Center the heatmap group in the svg */
  heatmap.attr("transform", function(d) {
    let bboxWDiff = d.bboxWidth - width;
    let bboxHDiff = d.bboxHeight - height;
    let newX = Math.round(margin.left + (bboxWDiff / 2));
    let newY = Math.round(margin.top + (bboxHDiff / 2) - (d.xAxisHeight / 2));
    return "translate(" + newX + "," + newY + ")"
  });

}