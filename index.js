const dataUrl = "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json";
let json, data = {}, req = new XMLHttpRequest(), formatMonth = d3.timeFormat("%B");

/** Send http req */
req.open("GET", dataUrl ,true);
req.send();
req.onload = function() {
  json = JSON.parse(req.responseText);
  // d3.select("main div#svg-container").text(JSON.stringify(json));

  // Create arrays from relevant json data, changing months to 0-11 instead of 1-12.
  data.years = { all: json.monthlyVariance.map(x => x.year)};
  data.months = { all: json.monthlyVariance.map(x => x.month - 1)};
  data.variances = { all: json.monthlyVariance.map(x => x.variance)};
  data.temps = { all: data.variances.all.map(x => +d3.format(".1~f")(json.baseTemperature + x))};

  // Deduplicate the previous arrays
  data.years.unique = [...new Set(data.years.all)];
  data.months.unique = [...new Set(data.months.all)];
  data.variances.unique = [...new Set(data.variances.all)];
  data.temps.unique = [...new Set(data.temps.all)];
  data.temps.uniqueHtoL = [...data.temps.unique].sort((a, b) => b - a);
  data.temps.uniqueLtoH = [...data.temps.unique].sort((a, b) => a - b);

  console.log(data);
  
  drawSvg();
};

/** Create hidden tooltip div */
const tooltip = d3.select("body")
  .append("div")
  .attr("id", "tooltip")
  .style("position", "absolute")
  .style("z-index", "10")
  .style("background", "hsla(0, 0%, 0%, .8)")
  .style("visibility", "hidden")
  .each(function() {
    d3.select(this).append("span").attr("id", "yr-mo");
    d3.select(this).append("span").attr("id", "tavg");
    d3.select(this).append("span").attr("id", "variance");
  })
;
/** built-in colorbrewer2.org color scheme, hot to cold, 11 colors 
 *    d3.schemeRdYlBu[11]
 * returns ['#a50026','#d73027','#f46d43','#fdae61','#fee090','#ffffbf','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695']
 * 
 * same as http://colorbrewer2.org/#type=diverging&scheme=RdYlBu&n=11
 * 
 * see https://medium.com/@Elijah_Meeks/color-advice-for-data-visualization-with-d3-js-33b5adc41c90
 */

function drawSvg() {

  /** Set properties for the svg element */
  const svgProps = {};
  svgProps.outerWidth = 1000;
  svgProps.outerHeight = svgProps.outerWidth / 1.6; // 16:10 aspect ratio
  svgProps.margin = {
    top: svgProps.outerHeight * .1, 
    right: svgProps.outerWidth * .07, 
    bottom: svgProps.outerHeight * .1, 
    left: svgProps.outerWidth * .06
  };
  svgProps.innerWidth = svgProps.outerWidth - svgProps.margin.left - svgProps.margin.right;
  svgProps.innerHeight = svgProps.outerHeight - svgProps.margin.top - svgProps.margin.bottom;

  // console.log(svgProps);

  
  /** Set the scales for x and y axes */
  const xScale = d3.scaleBand()
    .domain(data.years.unique)
    .range([0, svgProps.innerWidth])
  ;

  const yScale = d3.scaleBand()
    .domain(data.months.unique)
    .range([0, svgProps.innerHeight]) 
  ; 

  /** Axes to be called */
  const xAxis = d3.axisBottom(xScale)
    // Return ticks only for d values divisible by 10.
    // So, d % 10 = 0 = false. !(false) = true. 
    .tickValues(xScale.domain().filter(function(d) { return !(d % 10)}));
  ;
  
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(function(d) {
      
      return formatMonth(new Date(0, d));
    })
  ;

  /** Create svg element */
  const svg = d3.select("main div#svg-container")
    .append("svg")
    .attr("width", svgProps.outerWidth)
    .attr("height", svgProps.outerHeight)
  ;

  /** svg title text */
  svg.append("text")
    .attr("id", "title")
    .attr("x", (svgProps.outerWidth / 2))
    .attr("y", svgProps.margin.top / 4 * 3)
    .attr("fill", "#222")
    .style("text-anchor", "middle")
    .style("font-size", "1.25em")
    .style("font-weight", "bold")
    .text("Estimated Global Land-Surface TAVG (1753 - 2015)")
    .append("tspan")
    .attr("id", "description")
    .attr("x", (svgProps.outerWidth / 2))
    .attr("dy", 20)
    .attr("fill", "#222")
    .style("font-weight", "normal")
    .style("font-size", "0.7em")
    .text("1994 - 2015")
  ;

  /** Create heatmap group */
  const heatmap = svg.append("g")
    .attr("id", "heatmap")
  ;

  const colorScale = d3.scaleOrdinal()
    .domain(data.temps.uniqueHtoL)
    .range(d3.schemeRdYlBu[9])
  ;

  /** Create rects from json data */
  heatmap.selectAll("rect")
    .data(json.monthlyVariance)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", (d) => xScale(d.year))
    .attr("y", (d) => yScale(d.month - 1))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("data-month", (d) => d.month - 1)
    .attr("data-year", (d) => d.year)
    .attr("data-temp", (d) => +d3.format(".1~f")(json.baseTemperature + d.variance))
    .attr("fill", function(d) {
      let temp = d3.select(this).attr("data-temp")
      // console.log(temp);
      return colorScale(temp);
    })
    
  ;





  /** Create heatmap axes */
  // heatmap x-axis 
  heatmap.append("g")
    .attr("id", "x-axis")
    .attr("transform", "translate(0," + svgProps.innerHeight + ")")
    .call(xAxis)
  ;

  // heatmap y-axis
  heatmap.append("g")
    .attr("id", "y-axis")
    .attr("transform", "translate(0, 0)")
    .call(yAxis)
  ;




  /** Legend for heatmap, positioned on the right-edge */
  const legendGroup = svg.append("g")
    .attr("id", "legend")
    .attr("transform", "translate(" + 50 + ", " + 5 + ")")
    .style("outline", "1px solid lime")
  ;

  const legend = legendGroup.append("g");

  const legendXScale = d3.scaleBand()
    .domain([...new Set(json.monthlyVariance.map(x => x.year))])
    .range([0 , svgProps.innerWidth])
  ;

  // Create a rect for legend box that will center legend contents
  legend.append("rect")
    .attr("id", "legend-box")
    .attr("fill", "hsl(0, 0%, 96%)")
    .attr("rx", 8)
    .attr("ry", 8)
  ;
    
  // Group for legend text
  legend.append("g")
    .attr("id", "legend-text")
    .attr("font-size", ".8em")
    .style("text-anchor", "start")
    .style("outline", "1px solid blue")
    .each(function() {
      d3.select(this).append("text")
        .attr("dy", "1em")
        .text("Top placeholder text element ")
      ;
      d3.select(this).append("text")
        .attr("dy", "2.5em")
        .text("Bottom placeholder text element ")
      ;
    })
  ;

  // Position the legend contents
  legend.each(function() {
    // set padding for the legend box
    const padding = {top: 10, right: 10, bottom: 10, left: 10};
    // get legend-text group bbox dimensions
    const legendText = {
      width: +d3.format(".2~f")(this.querySelector("g#legend-text").getBBox().width),
      height: +d3.format(".2~f")(this.querySelector("g#legend-text").getBBox().height)
    };

    // Calculate legend-box rect dimensions
    const box = {
      width: Math.round(padding.left + legendText.width + padding.right), 
      height: Math.round(padding.top + legendText.height + padding.bottom)
    };
    
    // Position legend-box and set dimensions
    d3.select("rect#legend-box")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", box.width)
      .attr("height", box.height)
    ;

    // Position legend-text group, centered "within" legend-box
    d3.select("g#legend-text")
      .attr("transform", "translate(" + padding.left + ", " + padding.top + ")")
    ;
  });








  /** Now, get heatmap bbox dimensions and bind that data to group */
  heatmap.each(function() {
    let gData = {};
    gData.bboxWidth = d3.format(".2~f")(this.getBBox().width);
    gData.bboxHeight = d3.format(".2~f")(this.getBBox().height);
    d3.select("g#x-axis").each(function() {
      gData.xAxisHeight = d3.format(".2~f")(this.getBBox().height)
    });
    d3.select("g#y-axis").each(function() {
      gData.yAxisWidth = d3.format(".2~f")(this.getBBox().width)
    });
    d3.select(this).datum(gData);
  });

  /** Center the heatmap group in the svg */
  heatmap.attr("transform", function(d) {
    let bboxWDiff = d.bboxWidth - svgProps.innerWidth;
    let bboxHDiff = d.bboxHeight - svgProps.innerHeight;
    let newX = Math.round(svgProps.margin.left + (bboxWDiff / 2));
    let newY = Math.round(svgProps.margin.top + (bboxHDiff / 2) - (d.xAxisHeight / 2));
    return "translate(" + newX + "," + newY + ")"
  });


  /** Hover effects for tooltip */
  heatmap.selectAll(".cell")
   .on("mouseover", function(d) {
     let dataset = this.dataset, 
     year = dataset.year,
     month = formatMonth(new Date(0, dataset.month)),
     tempC = dataset.temp,
     tempF = d3.format(".1~f")(tempC * 1.8 + 32),
     varC = d.variance,
     yrMoText = year + ", " + month,
     tavgText = tempC + "℃ (" + tempF + "℉)",
     varianceText = varC + "℃" 
    //  tooltipBg = "hsla(0, 0%, 0%, 0.8)" 
     ;

     d3.select(this).style("outline", "1px solid lime");
     
     tooltip
       .style("visibility", "visible")
      //  .style("background", tooltipBg)
       .attr("data-year", dataset.year)
       .each(function() {
         d3.select("#yr-mo").text(yrMoText).style("font-weight", "bold");
         d3.select("#tavg").text(tavgText);
         d3.select("#variance").text(varianceText);
       })
     ;
   })
   .on("mousemove", function(d) { 
     tooltip
       .style("top", (d3.event.pageY - 50) + "px")
       .style("left", (d3.event.pageX + 10) + "px");
   })
   .on("mouseout", function() {
    d3.select(this).style("outline", "none");
    //  tooltip.style("visibility", "hidden");
   })
 ;
  
  

}