const dataUrl = "https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json";
let json, req = new XMLHttpRequest();

/** Send http req */
req.open("GET", dataUrl ,true);
req.send();
req.onload = function() {
  json = JSON.parse(req.responseText);
  d3.select("main div#svg-container").text(JSON.stringify(json));
};

