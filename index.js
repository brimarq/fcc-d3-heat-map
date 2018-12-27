const dataUrl = "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json";
let data, req = new XMLHttpRequest(), formatMonth = d3.timeFormat("%B");

/** Send http req */
req.open("GET", dataUrl ,true);
req.send();
req.onload = function() {
  data = JSON.parse(req.responseText);
  // d3.select("main div#svg-container").text(JSON.stringify(json));

  /** Add useful arrays and values from relevant data */
  // De-duplicated array of years mapped from monthlyVariance array objects
  data.years = [...new Set(data.monthlyVariance.map(x => x.year))];
  // De-duplicated array of months mapped from monthlyVariance array objects converted to 0-11 instead of 1-12.
  data.months = [...new Set(data.monthlyVariance.map(x => x.month - 1))];
  // De-duplicated array of temps created by first mapping variance from monthlyVariance array objects, 
  // then mapping that array to convert to temperature.
  data.temps = [...new Set(
    data.monthlyVariance.map(x => x.variance)
    .map(x => +d3.format(".1~f")(data.baseTemperature + x))
  )];
  // Min and max values from data.temps
  data.tempsMin = d3.min(data.temps);
  data.tempsMax = d3.max(data.temps);
  
  // console.log(data);
  
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
    right: svgProps.outerWidth * .05, 
    bottom: svgProps.outerHeight * .17, 
    left: svgProps.outerWidth * .1
  };
  svgProps.innerWidth = svgProps.outerWidth - svgProps.margin.left - svgProps.margin.right;
  svgProps.innerHeight = svgProps.outerHeight - svgProps.margin.top - svgProps.margin.bottom;
  svgProps.legend = {
    width: 330,
    height: 20,
    numColors: 11
  };

  // console.log(svgProps);

  
  /** Set the scales for x and y axes */
  const xScale = d3.scaleBand()
    .domain(data.years)
    .range([0, svgProps.innerWidth])
  ;

  const yScale = d3.scaleBand()
    .domain(data.months)
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
    .attr("fill", "#222")
    .style("font-size", "1.25em")
    .style("font-weight", "bold")
    .text("Estimated Global Land-Surface TAVG (1753 - 2015)")
  titleGroup.append("text")
    .attr("id", "description")
    .attr("dy", "1.25em")
    .attr("fill", "#222")
    .style("font-weight", "normal")
    .style("font-size", "1em")
    .text("using estimated base temperature " + data.baseTemperature + "℃")
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
    .attr("transform", "translate(" + svgProps.margin.left + ", " + svgProps.margin.top + ")")
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

  const colorScale = d3.scaleThreshold()
    .domain(getQuantileDomain(data.tempsMin, data.tempsMax, svgProps.legend.numColors))
    .range(d3.schemeRdYlBu[svgProps.legend.numColors].reverse())
  ;

  /** Create rects from json data */
  heatmap.selectAll("rect")
    .data(data.monthlyVariance)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", (d) => xScale(d.year))
    .attr("y", (d) => yScale(d.month - 1))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("data-month", (d) => d.month - 1)
    .attr("data-year", (d) => d.year)
    .attr("data-temp", (d) => d3.format(".1~f")(data.baseTemperature + d.variance))
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
  ;

  const legend = legendGroup.append("g")
    .attr("id", "legend")
  ;

  const legendXScale = d3.scaleLinear()
    .domain(d3.extent(data.temps))
    .range([0 , svgProps.legend.width])
  ;

  const legendXAxis = d3.axisBottom(legendXScale)
    .tickValues(colorScale.domain())
    .tickFormat(d3.format(".1f"))
  ;

  legend.selectAll("rect")
    .data([+data.tempsMin, ...colorScale.domain()])
    .enter()
    .append("rect")
    .attr("x", (d) => legendXScale(d))
    .attr("y", 0)
    .attr("width", svgProps.legend.width / svgProps.legend.numColors)
    .attr("height", svgProps.legend.height)
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
    let xAxisH = d3.select("g#x-axis").node().getBBox().height;
    let x = ((svgProps.outerWidth / 2) - (gWidth / 2));
    let y = (svgProps.outerHeight - ((svgProps.margin.bottom - xAxisH) / 2)) - (gHeight / 2);
    return "translate(" + x + ", " + y + ")";
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

     d3.select(this).attr("stroke", "lime");
     d3.select(this).attr("stroke-width", 1.5);
     
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
     d3.select(this).attr("stroke", "none");
     tooltip.style("visibility", "hidden");
   })
 ;

}