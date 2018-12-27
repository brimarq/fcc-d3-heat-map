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

function drawSvg() {

  /** Set properties for the svg element */
  const svgProps = {};
  svgProps.outerWidth = 1000;
  svgProps.outerHeight = svgProps.outerWidth / 1.6; // 16:10 aspect ratio
  svgProps.margin = {
    top: svgProps.outerHeight * .15, 
    right: svgProps.outerWidth * .07, 
    bottom: svgProps.outerHeight * .15, 
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
  const titleGroup = svg.append("g").attr("id", "title-group").style("text-anchor", "middle");
  titleGroup.append("text")
    .attr("id", "title")
    // .attr("dy", "1.25em")
    // .attr("y", svgProps.margin.top / 4 * 3)
    .attr("fill", "#222")
    // .style("text-anchor", "middle")
    .style("font-size", "1.25em")
    .style("font-weight", "bold")
    .text("Estimated Global Land-Surface TAVG (1753 - 2015)")
  titleGroup.append("text")
    .attr("id", "description")
    // .attr("x", (svgProps.outerWidth / 2))
    .attr("dy", "1.25em")
    .attr("fill", "#222")
    .style("font-weight", "normal")
    .style("font-size", "1em")
    .text("using estimated base temperature " + json.baseTemperature + "℃")
  ;
  // Center titleGroup horizontally on svg and vertically within top margin.
  titleGroup.attr("transform", function() {
    let gHeight = this.getBBox().height;
    let x = svgProps.outerWidth / 2;
    let y = ((svgProps.margin.top - gHeight) / 2) + (gHeight / 2);
    return "translate(" + x + ", " + y + ")";
  });

  /** Create heatmap group */
  const heatmap = svg.append("g")
    .attr("id", "heatmap")
  ;

  function getQuantileDomain(minValue, maxValue, numGroups) {
    /** This function creates a domain of quantiles for the number 
     * of groups suplied in the function. Since quantiles are the 
     * 'cut points' within a range of sequential values that divide
     * the range into groups, the min and max values will be left out
     * of the resulting array, and the domainArr.length will be 
     * numGroups - 1. The number of values in any range paired with
     * the resulting domainArr should be equal to the number of 
     * groups in numGroups.
     * See https://en.wikipedia.org/wiki/Quantile and 
     * https://github.com/d3/d3-scale/blob/master/README.md#scaleQuantile
     */
    let domainArr = [],
    groupSize = (maxValue - minValue) / numGroups;
    
    for (let i = 1; i < numGroups; i++) {
      domainArr.push(+d3.format(".1~f")(minValue + (groupSize * i)));
    }
    return domainArr;
  }

  console.log(getQuantileDomain(d3.min(data.temps.all), d3.max(data.temps.all), 11));
  console.log(getQuantileDomain(d3.min(data.temps.all), d3.max(data.temps.all), 11).length);

  const heatmapColorScheme = d3.schemeRdYlBu[11].reverse();

  const colorScale = d3.scaleThreshold()
    .domain(getQuantileDomain(d3.min(data.temps.unique), d3.max(data.temps.unique), 11))
    .range(heatmapColorScheme)
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
    .attr("data-temp", (d) => d3.format(".1~f")(json.baseTemperature + d.variance))
    .attr("fill", function(d) {
      let temp = +d3.select(this).node().dataset.temp;
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
    .attr("id", "legend-group")
    .attr("transform", "translate(" + 50 + ", " + 5 + ")")
    .style("outline", "1px solid lime")
  ;

  const legend = legendGroup.append("g")
    .attr("id", "legend")
    // .attr("transform", function() {
    //   let x = 0, y = svgProps.innerHeight + 30;
    //   return "translate(" + x + ", " + y + ")"
    // })
    // .style("outline", "1px solid lime")
  
  ;

  const legendXScale = d3.scaleLinear()
    .domain(d3.extent(data.temps.unique))
    .range([0 , 30 * 11])
  ;

  const legendXAxis = d3.axisBottom(legendXScale)
    .tickValues(colorScale.domain())
    .tickFormat(d3.format(".1f"))
  ;

  legend.selectAll("rect")
    .data([+d3.min(data.temps.unique), ...colorScale.domain()])
    .enter()
    .append("rect")
    // .attr("x", function(d, i) { return i * 20})
    .attr("x", (d) => legendXScale(d))
    .attr("y", 0)
    .attr("width", 30)
    .attr("height", 20)
    .attr("fill", function(d) {return colorScale(d)})
  ;

  legend.append("g")
    .attr("id", "legend-x-axis")
    .attr("transform", "translate(0," + d3.select("g#legend").node().getBBox().height + ")")
    .call(legendXAxis)
  ;

  // Center legendGroup horizontally on svg and vertically within bottom margin.
  legendGroup.attr("transform", function() { 
    let gWidth = this.getBBox().width;
    let gHeight = this.getBBox().height;
    let x = ((svgProps.outerWidth / 2) - (gWidth / 2));
    let y = (svgProps.outerHeight - (svgProps.margin.bottom / 2)) - (gHeight / 2);
    return "translate(" + x + ", " + y + ")";
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
    return "translate(" + newX + "," + svgProps.margin.top + ")"
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
     varianceText = varC < 0 ? varC + "℃" : "+" + varC + "℃"
     ;
    
     d3.select(this).style("outline", "2px solid lime");
     
     tooltip
       .style("visibility", "visible")
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
       .style("top", (d3.event.pageY - 70) + "px")
       .style("left", (d3.event.pageX + 20) + "px");
   })
   .on("mouseout", function() {
    d3.select(this).style("outline", "none");
     tooltip.style("visibility", "hidden");
   })
 ;
  
  






}