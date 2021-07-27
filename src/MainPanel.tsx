import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { PanelOptions, Frame } from 'types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom, Select } from 'ol/interaction';
import { SelectEvent } from 'ol/interaction/Select';
import { platformModifierKeyOnly, click } from 'ol/events/condition';
// import { Style, Text, Stroke, Fill } from 'ol/style';
// import { pointerMove } from 'ol/events/condition';
import { createHeatLayer, processData } from './utils/helpers';
import { nanoid } from 'nanoid';
import 'ol/ol.css';
import './main.css';

interface Props extends PanelProps<PanelOptions> {}
interface State {
  selected: boolean;
  name: string;
  net_value: number;
  quantity: number;
  visitors: number;
  floor: number;
  show_net: boolean;
  show_quantity: boolean;
}

export class MainPanel extends PureComponent<Props, State> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  heatLayer: VectorLayer;
  select: Select;
  by_net_value: { [key: string]: number } = {};
  by_quantity: { [key: string]: number } = {};
  by_visitors: { [key: string]: number } = {};
  net1: VectorLayer;
  quan1: VectorLayer;
  net2: VectorLayer;
  quan2: VectorLayer;

  state: State = {
    selected: false,
    name: '',
    net_value: 0,
    quantity: 0,
    visitors: 0,
    floor: 0,
    show_net: true,
    show_quantity: false,
  };

  componentDidMount() {
    console.log('erp ', this.props.data);
    const { tile_url1, zoom_level, center_lon, center_lat } = this.props.options;

    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });

    const min = fromLonLat([center_lon - 0.02, center_lat - 0.02]);

    const max = fromLonLat([center_lon + 0.02, center_lat + 0.02]);
    const extent = [...min, ...max] as [number, number, number, number];

    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
        extent,
      }),
      target: this.id,
    });

    if (tile_url1 !== '') {
      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url1,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);
    }

    if (this.props.data.series.length > 0) {
      const { by_net_value, by_quantity, by_visitors } = processData(this.props.data.series as Frame[]);

      this.by_net_value = by_net_value;
      this.by_quantity = by_quantity;
      this.by_visitors = by_visitors;

      if (this.props.options.geojson1 && this.props.options.geojson2) {
        // this.heatLayer = createHeatLayer(this.props.data.series as Frame[], this.props.options.geojson1);
        // this.map.addLayer(this.heatLayer);
        const { net1, quan1, net2, quan2 } = createHeatLayer(
          this.by_net_value,
          this.by_quantity,
          this.props.options.geojson1,
          this.props.options.geojson2
        );

        this.net1 = net1;
        this.quan1 = quan1;
        this.net2 = net2;
        this.quan2 = quan2;

        this.map.addLayer(this.net1);
      }
    }

    this.select = new Select({
      condition: click,
      filter: feature => {
        return feature.getGeometry().getType() == 'Polygon';
      },
    });
    this.map.addInteraction(this.select);

    this.select.on('select', (e: SelectEvent) => {
      const selectedFeature = e.target.getFeatures().item(0);

      if (!selectedFeature) {
        this.setState(prevState => ({
          ...prevState,
          selected: false,
          name: '',
          net_value: 0,
          quantity: 0,
          visitors: 0,
        }));
        return;
      }

      const name = selectedFeature.get('name');
      console.log('name ', name);
      // const net_value = selectedFeature.get('net_value');
      // const quantity = selectedFeature.get('quantity');
      const net_value = this.by_net_value[name];
      const quantity = this.by_quantity[name];
      const visitors = this.by_visitors[name];
      this.setState(prevState => ({ ...prevState, selected: true, name, net_value, quantity, visitors }));
    });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.data.series !== this.props.data.series) {
      console.log('update ', this.props.data);
      this.map.removeLayer(this.net1);
      this.map.removeLayer(this.quan1);
      this.map.removeLayer(this.net1);
      this.map.removeLayer(this.quan2);

      if (this.props.data.series.length == 0) {
        this.setState({
          selected: false,
          name: '',
          net_value: 0,
          quantity: 0,
          floor: 0,
          show_net: true,
          show_quantity: false,
        });
        return;
      }
      const { by_net_value, by_quantity, by_visitors } = processData(this.props.data.series as Frame[]);

      this.by_net_value = by_net_value;
      this.by_quantity = by_quantity;
      this.by_visitors = by_visitors;

      if (this.props.options.geojson1 && this.props.options.geojson2) {
        const { net1, quan1, net2, quan2 } = createHeatLayer(
          this.by_net_value,
          this.by_quantity,
          this.props.options.geojson1,
          this.props.options.geojson2
        );

        this.net1 = net1;
        this.quan1 = quan1;
        this.net2 = net2;
        this.quan2 = quan2;

        const { floor, show_net } = this.state;

        if (show_net && floor == 0) this.map.addLayer(this.net1);
        else if (show_net && floor == 1) this.map.addLayer(this.net2);
        else if (!show_net && floor == 0) this.map.addLayer(this.quan1);
        else if (!show_net && floor == 1) this.map.addLayer(this.quan2);
      }
    }

    if (prevProps.options.tile_url1 !== this.props.options.tile_url1) {
      this.map.removeLayer(this.randomTile);

      if (this.props.options.tile_url1 !== '') {
        this.randomTile = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url1,
          }),
          zIndex: 1,
        });
        this.map.addLayer(this.randomTile);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level)
      this.map.getView().setZoom(this.props.options.zoom_level);

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    )
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });

    if (prevState.floor !== this.state.floor) {
      this.map.removeLayer(this.randomTile);
      const { tile_url1, tile_url2 } = this.props.options;

      const tile_url = this.state.floor == 0 ? tile_url1 : tile_url2;

      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);

      this.map.removeLayer(this.net1);
      this.map.removeLayer(this.net2);
      this.map.removeLayer(this.quan1);
      this.map.removeLayer(this.quan2);

      const { floor, show_net } = this.state;

      if (show_net && floor == 0) this.map.addLayer(this.net1);
      else if (show_net && floor == 1) this.map.addLayer(this.net2);
      else if (!show_net && floor == 0) this.map.addLayer(this.quan1);
      else if (!show_net && floor == 1) this.map.addLayer(this.quan2);
    }

    if (prevState.show_net != this.state.show_net) {
      this.map.removeLayer(this.net1);
      this.map.removeLayer(this.net2);
      this.map.removeLayer(this.quan1);
      this.map.removeLayer(this.quan2);

      const { floor, show_net } = this.state;

      if (show_net && floor == 0) this.map.addLayer(this.net1);
      else if (show_net && floor == 1) this.map.addLayer(this.net2);
      else if (!show_net && floor == 0) this.map.addLayer(this.quan1);
      else if (!show_net && floor == 1) this.map.addLayer(this.quan2);
    }
  }

  handleFloor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (this.state.floor == Number(value)) return;

    this.setState(prevState => ({
      ...prevState,
      floor: Number(value),
      selected: false,
      name: '',
      net_value: 0,
      quantity: 0,
    }));
  };

  handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const { show_net, show_quantity } = this.state;
    if (name == 'show_net' && !show_net)
      this.setState(prevState => ({ ...prevState, show_net: true, show_quantity: false }));

    if (name == 'show_quantity' && !show_quantity)
      this.setState(prevState => ({ ...prevState, show_net: false, show_quantity: true }));
  };

  render() {
    const { width, height } = this.props;
    const { floor, show_net, show_quantity, selected, name, net_value, quantity, visitors } = this.state;

    return (
      <div style={{ display: 'relative', width, height }}>
        <div id={this.id} style={{ width: '100%', height: '100%' }} />;
        <div className="p-tool">
          <div className="p-content">
            <input type="checkbox" name="show_net" checked={show_net} onChange={this.handleCheckbox} />{' '}
            <label> Net Value</label>
            <input type="checkbox" name="show_quantity" checked={show_quantity} onChange={this.handleCheckbox} />{' '}
            <label> Quantity</label>
          </div>
          <select value={floor} onChange={this.handleFloor}>
            <option value={0}>Ground Floor</option>
            <option value={1}>1st Floor</option>
          </select>
        </div>
        {selected && (
          <div className="p-info" style={{ position: 'absolute', bottom: 5, right: 0 }}>
            <h3>{name}</h3>
            <div className="p-info-content">
              <div>
                <span> Net Value</span> <span>{net_value}</span>
              </div>
              <div>
                <span> Quantity </span>
                <span>{quantity}</span>
              </div>
              <div>
                <span>Visitors</span>
                <span> {visitors}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
