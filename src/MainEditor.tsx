import React, { useState } from 'react';
//@ts-ignore
import { FormField, PanelOptionsGroup } from '@grafana/ui';
import { PanelEditorProps } from '@grafana/data';
import { PanelOptions } from './types';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from './img/DeleteIcon.svg';
import CheckIcon from './img/CheckIcon.svg';

const baseStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
  borderWidth: 2,
  borderRadius: 2,
  borderColor: '#eeeeee',
  borderStyle: 'dashed',
  backgroundColor: '#fafafa',
  color: '#bdbdbd',
  outline: 'none',
  transition: 'border .24s ease-in-out',
};

export const MainEditor: React.FC<PanelEditorProps<PanelOptions>> = ({ options, onOptionsChange }) => {
  const [inputs, setInputs] = useState(options);
  const [optionFile, setOption] = useState('geojson1');
  const [myFiles, setMyFiles] = useState<File[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    setInputs(prevState => ({
      ...prevState,
      [name]: type == 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = () => {
    onOptionsChange(inputs);
  };

  const onDrop = React.useCallback(
    acceptedFiles => {
      setMyFiles([...myFiles, ...acceptedFiles]);
    },
    [myFiles]
  );

  const { getRootProps, getInputProps, inputRef } = useDropzone({
    noKeyboard: true,
    maxSize: 20971520,
    multiple: true,
    onDrop,
  });

  const handleRemoveFile = (fileName: string) => {
    const dt = new DataTransfer();
    const leftOver = myFiles.filter(f => f.name !== fileName);
    leftOver.map(f => {
      dt.items.add(f);
    });

    if (inputRef.current) {
      inputRef.current.files = dt.files;
    }
    setMyFiles(leftOver);
  };

  const storeFile = (fileName: string) => {
    const reader = new FileReader();
    const chosenFile = myFiles.find(f => f.name === fileName);

    reader.onloadend = function() {
      const obj = JSON.parse(reader.result as string);
      onOptionsChange({
        ...inputs,
        [optionFile]: obj,
      });
    };
    reader.readAsText(chosenFile as Blob);
  };

  return (
    <PanelOptionsGroup>
      <div className="editor-row">
        <div className="section gf-form-group">
          <h5 className="section-heading">Map Visual Options</h5>
          <FormField
            label="Center Latitude"
            labelWidth={10}
            inputWidth={40}
            type="number"
            name="center_lat"
            value={inputs.center_lat}
            onChange={handleChange}
          />
          <FormField
            label="Center Longitude"
            labelWidth={10}
            inputWidth={40}
            type="number"
            name="center_lon"
            value={inputs.center_lon}
            onChange={handleChange}
          />
          <FormField
            label="Indoor Tile Map 1"
            labelWidth={10}
            inputWidth={80}
            type="text"
            name="tile_url1"
            value={inputs.tile_url1}
            onChange={handleChange}
          />
          <FormField
            label="Indoor Tile Map 2"
            labelWidth={10}
            inputWidth={80}
            type="text"
            name="tile_url2"
            value={inputs.tile_url2}
            onChange={handleChange}
          />
          <FormField
            label="Initial Zoom"
            labelWidth={10}
            inputWidth={40}
            type="number"
            name="zoom_level"
            value={inputs.zoom_level}
            onChange={handleChange}
          />
        </div>
        <div className="section gf-form-group">
          <div
            className="section-heading"
            style={{ display: 'flex', alignItems: 'center', marginTop: 7, marginBottom: 10 }}
          >
            <h5 style={{ marginRight: 10 }}>Drop File</h5>{' '}
            <select value={optionFile} onChange={e => setOption(e.target.value)} style={{ width: 120 }}>
              <option value="geojson1">GeoJSON1</option>
              <option value="geojson2">GeoJSON2</option>
            </select>
          </div>
          <section>
            <div {...getRootProps({ className: 'dropzone', style: baseStyle })}>
              <input {...getInputProps()} />
              <p>Drag 'n' drop File here, or click to select file</p>
            </div>
            {myFiles.length > 0 ? (
              <div>
                <h4>Files</h4>
                <div>
                  {myFiles.map(file => (
                    <p key={file.name}>
                      {file.name} ({file.size} bytes)
                      <button onClick={() => handleRemoveFile(file.name)}>
                        <img src={DeleteIcon} />
                      </button>
                      <button onClick={() => storeFile(file.name)}>
                        <img src={CheckIcon} />
                      </button>
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              ''
            )}
          </section>
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSubmit}>
        Submit
      </button>
    </PanelOptionsGroup>
  );
};
