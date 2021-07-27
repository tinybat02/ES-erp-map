import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill } from 'ol/style';
import { Frame, GeoJSON, FeatureGeojson } from '../types';

const percentageToHsl = (percentage: number) => {
  const hue = percentage * -120 + 120;
  return 'hsla(' + hue + ', 100%, 50%, 0.3)';
};

const createPolygon = (/* coordinates: number[][][] */ feature: FeatureGeojson, value: string, color: string) => {
  let coordinates: number[][][] = [];
  if (feature.geometry.type == 'Polygon') {
    coordinates = feature.geometry.coordinates;
  } else if (feature.geometry.type == 'LineString') {
    // @ts-ignore
    coordinates = [feature.geometry.coordinates];
  }
  const polygonFeature = new Feature({
    type: 'Polygon',
    geometry: new Polygon(coordinates).transform('EPSG:4326', 'EPSG:3857'),
  });
  // polygonFeature.set('value', value);
  // polygonFeature.set('color', color);
  polygonFeature.set('name', value);
  polygonFeature.setStyle(
    new Style({
      fill: new Fill({
        color: color,
      }),
    })
  );
  return polygonFeature;
};

// export const createHeatLayer = (series: Frame[], geojson: GeoJSON) => {
//   const stores: string[] = [];
//   const assignValueToStore: { [key: string]: number } = {};
//   const assignValueToStoreLog: { [key: string]: number } = {};

//   series.map(item => {
//     const sumValue = item.fields[0].values.buffer.reduce((sum, elm) => sum + elm, 0);
//     if (item.name /* && sumValue > 3 */) {
//       stores.push(item.name);
//       assignValueToStore[item.name] = sumValue;
//       assignValueToStoreLog[item.name] = Math.log2(sumValue);
//     }
//   });

//   const heatValues = Object.values(assignValueToStoreLog);
//   const max = Math.max(...heatValues);
//   const min = Math.min(...heatValues);
//   const range = max - min;

//   const polygons: Feature[] = [];

//   geojson.features.map(feature => {
//     if (feature.properties && feature.properties.name && stores.includes(feature.properties.name)) {
//       const percentage = (assignValueToStoreLog[feature.properties.name] - min) / range;
//       polygons.push(
//         createPolygon(
//           feature,
//           feature.properties.name + ' : ' + assignValueToStore[feature.properties.name],
//           range != 0 ? percentageToHsl(percentage) : 'hsla(49, 100%, 50%, 0.3)'
//         )
//       );
//     }
//   });

//   return new VectorLayer({
//     source: new VectorSource({
//       features: polygons,
//     }),
//     zIndex: 2,
//   });
// };

const produceFeature = (
  net_data: { [key: string]: number },
  quantity_data: { [key: string]: number },
  geojson: GeoJSON
) => {
  const net_log: { [key: string]: number } = {};

  const quan_log: { [key: string]: number } = {};

  geojson.features.map(feature => {
    if (feature.properties && feature.properties.name && net_data[feature.properties.name]) {
      if (!net_log[feature.properties.name]) {
        net_log[feature.properties.name] = Math.log2(net_data[feature.properties.name]);
        quan_log[feature.properties.name] = Math.log2(quantity_data[feature.properties.name]);
      }
    }
  });

  const net_max = Math.max(...Object.values(net_log));
  const net_min = Math.min(...Object.values(net_log));
  const net_range = net_max - net_min;
  const quan_max = Math.max(...Object.values(quan_log));
  const quan_min = Math.min(...Object.values(quan_log));
  const quan_range = quan_max - quan_min;

  const net_polygons: Feature[] = [];
  const quan_polygons: Feature[] = [];

  geojson.features.map(feature => {
    if (feature.properties && feature.properties.name && net_data[feature.properties.name]) {
      const net_percentage = (net_log[feature.properties.name] - net_min) / net_range;
      const quan_percentage = (quan_log[feature.properties.name] - quan_min) / quan_range;

      net_polygons.push(
        createPolygon(
          feature,
          feature.properties.name,
          net_range != 0 ? percentageToHsl(net_percentage) : 'hsla(49, 100%, 50%, 0.3)'
        )
      );

      quan_polygons.push(
        createPolygon(
          feature,
          feature.properties.name,
          quan_range != 0 ? percentageToHsl(quan_percentage) : 'hsla(49, 100%, 50%, 0.3)'
        )
      );
    }
  });

  return { net_polygons, quan_polygons };
};

export const createHeatLayer = (
  net_data: { [key: string]: number },
  quantity_data: { [key: string]: number },
  geojson1: GeoJSON,
  geojson2: GeoJSON
) => {
  const { net_polygons: net_polygon1, quan_polygons: quan_polygon1 } = produceFeature(
    net_data,
    quantity_data,
    geojson1
  );
  const { net_polygons: net_polygon2, quan_polygons: quan_polygon2 } = produceFeature(
    net_data,
    quantity_data,
    geojson2
  );

  return {
    net1: new VectorLayer({
      source: new VectorSource({
        features: net_polygon1,
      }),
      zIndex: 2,
    }),
    quan1: new VectorLayer({
      source: new VectorSource({
        features: quan_polygon1,
      }),
      zIndex: 2,
    }),
    net2: new VectorLayer({
      source: new VectorSource({
        features: net_polygon2,
      }),
      zIndex: 2,
    }),
    quan2: new VectorLayer({
      source: new VectorSource({
        features: quan_polygon2,
      }),
      zIndex: 2,
    }),
  };
};

export const processData = (series: Frame[]) => {
  const by_net_value: { [key: string]: number } = {};
  const by_quantity: { [key: string]: number } = {};
  const by_visitors: { [key: string]: number } = {};

  series.map(area => {
    const sum = area.fields[0].values.buffer.reduce((total, el) => total + el, 0);

    const polygon_name = area.name || '_';
    if (polygon_name.startsWith('_')) by_net_value[polygon_name.substring(1)] = Math.round(sum * 100) / 100;
    else if (polygon_name.startsWith('0_')) by_quantity[polygon_name.substring(2)] = Math.round(sum * 10) / 10;
    else by_visitors[polygon_name] = Math.round(sum);
  });

  return { by_net_value, by_quantity, by_visitors };
};
