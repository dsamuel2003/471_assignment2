const width = 1200;
const height = 800;

const countries = [
  { name: "Germany", color: "steelblue" },
  { name: "Japan", color: "red" },
  { name: "Turkey", color: "green" },
];

const initialYearRange = [2012, 2024];

function createVis(data) {
  const margin = {
    top: 70,
    right: 180,
    bottom: 100,
    left: 100,
  };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  function getCountryName(value) {
    const country = String(value).trim().toUpperCase();

    if (country === "DEU" || country === "GERMANY") {
      return "Germany";
    }

    if (country === "JPN" || country === "JAPAN") {
      return "Japan";
    }

    if (
      country === "TUR" ||
      country === "TURKEY" ||
      country === "TÜRKIYE" ||
      country === "TÜRKİYE"
    ) {
      return "Turkey";
    }

    return null;
  }

  const filteredData = data
    .map((d) => ({
      country: getCountryName(d.country),
      year: d.year,
      value: d.value,
    }))
    .filter(
      (d) =>
        d.country !== null &&
        Number.isFinite(d.year) &&
        Number.isFinite(d.value),
    );

  const groupedData = d3.rollups(
    filteredData,
    (values) => d3.mean(values, (d) => d.value),
    (d) => d.country,
    (d) => d.year,
  );

  const countryData = countries.map((country) => {
    const countryGroup = groupedData.find((d) => d[0] === country.name);

    let values = [];

    if (countryGroup !== undefined) {
      values = countryGroup[1]
        .map((d) => ({
          year: d[0],
          value: d[1],
        }))
        .sort((a, b) => a.year - b.year);
    }

    return {
      name: country.name,
      color: country.color,
      values: values,
    };
  });

  const allYears = filteredData.map((d) => d.year);

  const minYear = d3.min(allYears);

  const x = d3.scaleLinear().domain(initialYearRange).range([0, innerWidth]);

  const y = d3.scaleLinear().domain([0, 350000]).range([innerHeight, 0]);

  const line = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.value));

  const svg = d3
    .select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  const clipId = "chart-clip";

  svg
    .append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight);

  const chartG = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const plotG = chartG.append("g").attr("clip-path", `url(#${clipId})`);

  const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));

  chartG
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(xAxis);

  const yAxis = d3.axisLeft(y);

  chartG.append("g").attr("class", "y-axis").call(yAxis);

  chartG
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 65)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .text("Year");

  chartG
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -65)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .text("Pollution Index");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .attr("font-size", "26px")
    .attr("font-weight", "bold")
    .text("Greenhouse Gas Emissions by Country");

  const countryLines = plotG
    .append("g")
    .selectAll("path")
    .data(countryData.filter((d) => d.values.length > 0))
    .join("path")
    .attr("class", "country-line")
    .attr("fill", "none")
    .attr("stroke", (d) => d.color)
    .attr("stroke-width", 3)
    .attr("d", (d) => line(d.values));

  const dataPoints = plotG
    .append("g")
    .selectAll("circle")
    .data(
      countryData
        .map(
          (country) =>
            country.values.map((d) => ({
              country: country.name,
              color: country.color,
              year: d.year,
              value: d.value,
            })),
          //.flat combines each arr
        )
        .flat(),
    )
    .join("circle")
    .attr("class", "data-point")
    .attr("cx", (d) => x(d.year))
    .attr("cy", (d) => y(d.value))
    .attr("r", 4)
    .attr("fill", (d) => d.color);

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - margin.right + 30},${margin.top})`);

  countries.forEach((country, i) => {
    const legendRow = legend
      .append("g")
      .attr("transform", `translate(0,${i * 35})`);

    legendRow
      .append("line")
      .attr("x1", 0)
      .attr("x2", 25)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", country.color)
      .attr("stroke-width", 3);

    legendRow
      .append("text")
      .attr("x", 35)
      .attr("y", 5)
      .text(country.name)
      .attr("font-size", "16px");
  });

  let showingAllYears = false;

  function updateChart() {
    let yearRange = [];

    if (showingAllYears) {
      yearRange = initialYearRange;
    } else {
      yearRange = [minYear, 2024];
    }

    const chartTransition = svg
      .transition()
      .duration(800)
      // easeCubicInOut: makes the animation start and end smoothly here for shifting x-axes
      .ease(d3.easeCubicInOut);

    chartTransition.tween("year-range", function () {
      //switch between the 2 year ranges
      const interpolateYearRange = d3.interpolateArray(x.domain(), yearRange);

      return function (t) {
        x.domain(interpolateYearRange(t));

        chartG.select(".x-axis").call(xAxis);

        countryLines.attr("d", (d) => line(d.values));

        dataPoints.attr("cx", (d) => x(d.year));
      };
    });

    showingAllYears = !showingAllYears;

    button.text("change my hat 𐚁");

    if (showingAllYears) {
      button.style("background-color", "white").style("color", "black");
    } else {
      button.style("background-color", "black").style("color", "white");
    }

    button.style("border", "1px solid black");
  }

  const button = d3.select("#hatButton");

  button
    .text("change my hat 𐚁")
    .style("background-color", "black")
    .style("color", "white")
    .style("border", "1px solid black")
    .on("click", updateChart);
}

function init() {
  d3.csv("./data/data.csv")
    .then((data) => {
      const formattedData = data.map((d) => ({
        country: d.REF_AREA,
        year: +d.TIME_PERIOD,
        value: +d.OBS_VALUE,
      }));

      createVis(formattedData);
    })
    .catch((error) =>
      console.error("An error occurred when loading data.csv:", error),
    );
}

window.addEventListener("load", init);
