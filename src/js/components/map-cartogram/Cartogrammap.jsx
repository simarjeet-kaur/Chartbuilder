import React, {Component, PropTypes} from 'react';
import {flatten, each, clone, map} from 'lodash';
import {centroid} from 'turf';

import d3 from 'd3';
// Map
const topojson = require('topojson');
import update from 'react-addons-update';

const CartogramCollection = require('./MapCartogramRenderer.jsx');
const ChartRendererMixin = require("../mixins/MapRendererMixin");

const radius = d3.scale.sqrt();
const cartogramClass = 'cartogram-Polygons';
const convertFipstoPostal = require('us-abbreviations')('fips','postal');

class MapRenderer extends React.Component{

  constructor(props) {
    super(props);

	  const schema = props.chartProps.schema.schema;
    const cartogramType = schema.name;

    if (cartogramType === 'states50') {

	    const grid = {};

	    d3.select("#grid." + cartogramType)
	    .text().split("\n")
	    .forEach(function(line, i) {
	      let re = /\w+/g, m;
	      while (m = re.exec(line)) {
	        grid[m[0]] = [m.index / 3, i]
	      }
	    });

	    const centroidsConst = [];
	    const data = topojson.feature(schema.topojson, schema.topojson.objects[schema.feature]);

	    data.features.map((polygonData, i) => {

	      const center = centroid(polygonData);
	      const id = polygonData.id < 10 ? '0' + polygonData.id.toString() : polygonData.id;

	      centroidsConst.push({"type":"Feature","id":id,
	          "geometry":{"type":"Point","coordinates": center.geometry.coordinates},
	          "properties":{"name":id} });
	    });

	    this.state = {
	      grid: grid,
	      nodes: [],
	      centroids: centroidsConst
	    }
  	}
  }

  render () {

    const chartProps = this.props.chartProps;
    const stylings = chartProps.stylings;
    const schema = chartProps.schema.schema;
    const grid = this.state.grid;

		const displayConfig = this.props.displayConfig;

    const centroids = this.state.centroids;
    const columnNames = chartProps.columns;
    const cellSize = stylings.cellSize;

    const projection = d3.geo[schema.proj]()
      .translate(schema.translate)
      .scale(schema.scale);

    const scales = {};
    const dataById = d3.map(chartProps.alldata, function(d) { return schema.matchLogic(d[columnNames[0]]); });

    radius
    	.range([0, stylings.radiusVal])
    	.domain([0, d3.max(chartProps.alldata, function(d){ return +d[columnNames[2]]} )]);

    const showDC = (!stylings.showDC) ? false : true;

    const nodes = centroids
      .filter(function(d) {

        if (schema.name === 'states50') {

          if (showDC) return (dataById.has(schema.matchLogic(d.id)) && schema.test(d.id, d.id));
          //dc id = 11
          else return (dataById.has(schema.matchLogic(d.id)) && schema.test(d.id, d.id) && d.id != 11);
        }
        else return (dataById.has(schema.matchLogic(d.id)) && schema.test(d.id, d.id));
      })
      .map((d) => {

        const shp = d.id;

        const shpData = dataById.get(schema.matchLogic(shp));
        const cell = grid[shpData[columnNames[0]].replace(/\s/g, '')];
        const point = projection(d.geometry.coordinates);

        let fillVal;
        if (chartProps.chartSettings[shpData.index].scale.domain[0] ===
            chartProps.chartSettings[shpData.index].scale.domain[1]) {
          fillVal = colorScales(chartProps.scale[shpData.index].colorIndex)[1];
        }
        else fillVal = chartProps.scale[shpData.index].d3scale(shpData[columnNames[2]]);

      return {
        id: +d.id,
        x: 160 + point[0], y: 60 + point[1],
        x0: 160 + point[0], y0: 60 + point[1],
        xx: 237 + cell[0] * cellSize, yy: cell[1] * cellSize - (cellSize / 2),
        r: radius(shpData[columnNames[2]]),
        r0: radius(shpData[columnNames[2]]),
        value: shpData[columnNames[2]],
        shp: shpData[columnNames[0]],
        color: fillVal
      };
    });

    return (
          <CartogramCollection
            chartProps= {chartProps}
            stylings={stylings}
            displayConfig={displayConfig}
            polygonClass={cartogramClass}
            nodes={nodes}
          />
    );
  }
};

MapRenderer.propTypes = {
  chartProps: React.PropTypes.object.isRequired
}

module.exports = MapRenderer;
