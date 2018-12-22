const dataUrl = "" 
let json, req = new XMLHttpRequest();

/** Send http req */
req.open("GET", dataUrl ,true);
req.send();
req.onload = function() {
  json = JSON.parse(req.responseText);
  d3.select("main div#svg-container").text(json);
};

